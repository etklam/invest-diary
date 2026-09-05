// @vitest-environment node
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'
import { $fetch, setup, url } from '@nuxt/test-utils/e2e'
import bcrypt from 'bcryptjs'
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { signAccessToken } from '~/lib/jwt'
import { assertDisposableDatabaseUrl } from '~/scripts/test-database-guard'
import type { ClientToServerEvents, ServerToClientEvents } from '~/types/websocket'

const databaseUrl = process.env.BACKEND_HTTP_TEST_DATABASE_URL
const describeHttp = databaseUrl ? describe.sequential : describe.skip

if (databaseUrl) {
  assertDisposableDatabaseUrl(databaseUrl, { databaseName: 'backend_http_test' })
  await setup({
    rootDir: process.cwd(),
    browser: false,
    server: true,
    build: true,
    setupTimeout: 180_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrl,
      JWT_SECRET: 'backend-http-contract-secret-not-placeholder',
      NUXT_PUBLIC_SITE_URL: 'http://127.0.0.1',
      TRUST_X_FORWARDED_FOR: 'true',
      NODE_PATH: resolve(process.cwd(), 'node_modules'),
    },
  })
}

type Client = ClientSocket<ServerToClientEvents, ClientToServerEvents>
const TEST_EMAILS = [
  'ws-revoke-target@example.com',
  'ws-revoke-other@example.com',
  'ws-revoke-admin@example.com',
]

describeHttp('real Nitro + MariaDB WebSocket session revocation', () => {
  let prisma: PrismaClient
  let clients: Client[] = []
  let target: { id: bigint; email: string; tokenVersion: number }
  let other: { id: bigint; email: string; tokenVersion: number }
  let admin: { id: bigint; email: string; tokenVersion: number }

  const tokenFor = (user: { id: bigint; email: string; tokenVersion: number }, role = 'USER') =>
    signAccessToken(user.id.toString(), user.email, role, user.tokenVersion)

  async function connect(token: string): Promise<Client> {
    const client = createClient(url('/'), {
      path: '/socket.io/',
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    })
    clients.push(client)
    await new Promise<void>((resolve, reject) => {
      client.once('connect', resolve)
      client.once('connect_error', reject)
    })
    return client
  }

  async function expectRejected(token: string) {
    const client = createClient(url('/'), {
      path: '/socket.io/',
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    })
    clients.push(client)
    await expect(new Promise<never>((_, reject) => {
      client.once('connect_error', reject)
    })).rejects.toMatchObject({ message: 'Invalid token' })
  }

  function disconnected(client: Client): Promise<void> {
    return new Promise(resolve => client.once('disconnect', () => resolve()))
  }

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl!) })
  })

  beforeEach(async () => {
    for (const client of clients) client.close()
    clients = []
    await prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } })
    const password = await bcrypt.hash('password123', 4)
    ;[target, other, admin] = await Promise.all([
      prisma.user.create({ data: { email: TEST_EMAILS[0]!, password } }),
      prisma.user.create({ data: { email: TEST_EMAILS[1]!, password } }),
      prisma.user.create({ data: { email: TEST_EMAILS[2]!, password, role: 'ADMIN' } }),
    ])
  })

  afterAll(async () => {
    for (const client of clients) client.close()
    await prisma?.user.deleteMany({ where: { email: { in: TEST_EMAILS } } })
    await prisma?.$disconnect()
  })

  it('logout-all disconnects both target devices, keeps another user online, and accepts fresh credentials', async () => {
    const oldToken = await tokenFor(target)
    const [deviceA, deviceB, otherClient] = await Promise.all([
      connect(oldToken),
      connect(oldToken),
      connect(await tokenFor(other)),
    ])
    const disconnectedA = disconnected(deviceA)
    const disconnectedB = disconnected(deviceB)

    await $fetch('/api/auth/logout-all', {
      method: 'POST',
      headers: { authorization: `Bearer ${oldToken}` },
    })

    await Promise.all([disconnectedA, disconnectedB])
    expect(otherClient.connected).toBe(true)
    await expectRejected(oldToken)

    const login = await $fetch<any>('/api/auth/native/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.50.0.1' },
      body: { email: target.email, password: 'password123', deviceName: 'Fresh device' },
    })
    const freshClient = await connect(login.data.accessToken)
    expect(freshClient.connected).toBe(true)
  })

  it('password change disconnects active sockets and only the new login can reconnect', async () => {
    const oldToken = await tokenFor(target)
    const client = await connect(oldToken)
    const didDisconnect = disconnected(client)

    await $fetch('/api/user/password', {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${oldToken}`,
        'x-forwarded-for': '10.50.0.2',
      },
      body: { currentPassword: 'password123', newPassword: 'new-password-123' },
    })

    await didDisconnect
    await expectRejected(oldToken)
    const login = await $fetch<any>('/api/auth/native/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.50.0.3' },
      body: { email: target.email, password: 'new-password-123', deviceName: 'Changed password' },
    })
    expect((await connect(login.data.accessToken)).connected).toBe(true)
  })

  it('admin deletion disconnects only the deleted user and prevents reconnection', async () => {
    const targetToken = await tokenFor(target)
    const adminToken = await tokenFor(admin, 'ADMIN')
    const targetClient = await connect(targetToken)
    const otherClient = await connect(await tokenFor(other))
    const didDisconnect = disconnected(targetClient)

    await $fetch(`/api/admin/users/${target.id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    await didDisconnect
    expect(otherClient.connected).toBe(true)
    await expectRejected(targetToken)
    await expect(prisma.user.findUnique({ where: { id: target.id } })).resolves.toBeNull()
  })
})
