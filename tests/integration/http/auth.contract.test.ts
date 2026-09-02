// @vitest-environment node
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'
import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import bcrypt from 'bcryptjs'
import { signAccessToken } from '~/lib/jwt'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const databaseUrl = process.env.BACKEND_HTTP_TEST_DATABASE_URL
const describeHttp = databaseUrl ? describe.sequential : describe.skip

if (databaseUrl) {
  const parsed = new URL(databaseUrl)
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)
    || parsed.pathname !== '/backend_http_test') {
    throw new Error('Refusing to run HTTP contract tests outside disposable backend_http_test')
  }

  await setup({
    rootDir: process.cwd(),
    browser: false,
    server: true,
    build: true,
    setupTimeout: 180_000,
    env: {
      DATABASE_URL: databaseUrl,
      JWT_SECRET: 'backend-http-contract-secret-not-placeholder',
      TRUST_X_FORWARDED_FOR: 'true',
      NODE_PATH: resolve(process.cwd(), 'node_modules'),
    },
  })
}

describeHttp('real Nitro + MariaDB native auth contract', () => {
  let prisma: PrismaClient

  const nativeLogin = (deviceName: string, ip: string) => $fetch<any>('/api/auth/native/login', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: { email: 'native-http@example.com', password: 'password123', deviceName },
  })

  const bearerHeadersFor = async (email: string) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } })
    const token = await signAccessToken(user.id.toString(), user.email, user.role, user.tokenVersion)
    return { authorization: `Bearer ${token}` }
  }

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl!) })
    await prisma.refreshToken.deleteMany()
    await prisma.user.deleteMany({
      where: { email: { in: ['native-http@example.com', 'web-http@example.com', 'other-http@example.com'] } },
    })
    const password = await bcrypt.hash('password123', 4)
    await prisma.user.createMany({
      data: [
        { email: 'native-http@example.com', password, name: 'Native HTTP' },
        { email: 'web-http@example.com', password, name: 'Web HTTP' },
        { email: 'other-http@example.com', password, name: 'Other HTTP' },
      ],
    })
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it('returns a JSON pair without auth cookies and accepts the Bearer access token', async () => {
    const response = await fetch('/api/auth/native/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
      body: JSON.stringify({
        email: 'native-http@example.com', password: 'password123', deviceName: 'Phone A',
      }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie') ?? '').not.toMatch(/(?:access|refresh)-token=/)
    expect(body.data).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      accessTokenExpiresAt: expect.stringMatching(/Z$/),
      refreshTokenExpiresAt: expect.stringMatching(/Z$/),
      user: { id: expect.stringMatching(/^\d+$/), email: 'native-http@example.com' },
    })

    const me = await $fetch<any>('/api/auth/me', {
      headers: { authorization: `Bearer ${body.data.accessToken}` },
    })
    expect(me.data.email).toBe('native-http@example.com')
  })

  it('rotates A to B and contains stale A replay to one device family', async () => {
    const a = await nativeLogin('Phone Replay', '10.0.0.2')
    const other = await nativeLogin('Tablet Safe', '10.0.0.3')
    const b = await $fetch<any>('/api/auth/native/refresh', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.1.1' },
      body: { refreshToken: a.data.refreshToken },
    })
    expect(b.data.refreshToken).not.toBe(a.data.refreshToken)

    await expect($fetch('/api/auth/native/refresh', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.1.2' },
      body: { refreshToken: a.data.refreshToken },
    })).rejects.toMatchObject({ statusCode: 401 })
    await expect($fetch('/api/auth/native/refresh', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.1.3' },
      body: { refreshToken: b.data.refreshToken },
    })).rejects.toMatchObject({ statusCode: 401 })

    const safe = await $fetch<any>('/api/auth/native/refresh', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.1.4' },
      body: { refreshToken: other.data.refreshToken },
    })
    expect(safe.data.refreshToken).toEqual(expect.any(String))
  })

  it('logout-one is idempotent; logout-all invalidates every family and access token', async () => {
    const one = await nativeLogin('Phone Logout', '10.0.0.4')
    const all = await nativeLogin('Tablet Logout All', '10.0.0.5')

    await $fetch('/api/auth/native/logout', {
      method: 'POST', body: { refreshToken: one.data.refreshToken },
    })
    await $fetch('/api/auth/native/logout', {
      method: 'POST', body: { refreshToken: one.data.refreshToken },
    })
    await expect($fetch('/api/auth/native/refresh', {
      method: 'POST', body: { refreshToken: one.data.refreshToken },
    })).rejects.toMatchObject({ statusCode: 401 })

    await $fetch('/api/auth/logout-all', {
      method: 'POST',
      headers: { authorization: `Bearer ${all.data.accessToken}` },
    })
    await expect($fetch('/api/auth/me', {
      headers: { authorization: `Bearer ${all.data.accessToken}` },
    })).rejects.toMatchObject({ statusCode: 401 })
    await expect($fetch('/api/auth/native/refresh', {
      method: 'POST', body: { refreshToken: all.data.refreshToken },
    })).rejects.toMatchObject({ statusCode: 401 })
  })

  it('keeps Web cookie login/refresh wire stable', async () => {
    const login = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.6' },
      body: JSON.stringify({ email: 'web-http@example.com', password: 'password123' }),
    })
    const setCookie = login.headers.get('set-cookie') ?? ''
    const access = /access-token=([^;,]+)/.exec(setCookie)?.[1]
    const refresh = /refresh-token=([^;,]+)/.exec(setCookie)?.[1]
    expect(access).toBeTruthy()
    expect(refresh).toBeTruthy()

    const refreshed = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { cookie: `access-token=${access}; refresh-token=${refresh}` },
    })
    expect(refreshed.status).toBe(200)
    expect(await refreshed.json()).toEqual({ ok: true })

    const invalidExplicit = await fetch('/api/auth/me', {
      headers: {
        authorization: 'Bearer definitely-invalid',
        cookie: `access-token=${access}; refresh-token=${refresh}`,
      },
    })
    expect(invalidExplicit.status).toBe(401)

    const me = await fetch('/api/auth/me', {
      headers: { cookie: `access-token=${access}; refresh-token=${refresh}` },
    })
    const csrf = /csrf-token=([^;,]+)/.exec(me.headers.get('set-cookie') ?? '')?.[1]
    expect(csrf).toBeTruthy()

    const missingCsrf = await fetch('/api/auth/logout-all', {
      method: 'POST',
      headers: { cookie: `access-token=${access}; refresh-token=${refresh}; csrf-token=${csrf}` },
    })
    expect(missingCsrf.status).toBe(403)

    const logoutAll = await fetch('/api/auth/logout-all', {
      method: 'POST',
      headers: {
        cookie: `access-token=${access}; refresh-token=${refresh}; csrf-token=${csrf}`,
        'x-csrf-token': csrf!,
      },
    })
    expect(logoutAll.status).toBe(200)
  })

  it('returns the stable 429 contract for bounded native login attempts', async () => {
    let lastError: any
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        await $fetch('/api/auth/native/login', {
          method: 'POST',
          headers: { 'x-forwarded-for': '10.9.9.9' },
          body: { email: `missing-${attempt}@example.com`, password: 'wrong' },
        })
      } catch (error) {
        lastError = error
      }
    }
    expect(lastError).toMatchObject({ statusCode: 429, data: { data: { code: 'AUTH_RATE_LIMITED' } } })
  })

  it('enforces the canonical Diary request, YMD/instant/ID wire, pagination, and conflict contract', async () => {
    const headers = await bearerHeadersFor('native-http@example.com')

    const unauthenticated = await fetch('/api/diaries')
    expect(unauthenticated.status).toBe(401)

    const legacyBody = await fetch('/api/diaries', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Legacy', content: 'No aliases', date: '2026-08-20', transactions: [{
        symbol: 'AAPL', type: 'BUY', quantity: 1, price: 100, trade_date: '2026-08-20T09:30:00.000Z',
      }] }),
    })
    expect(legacyBody.status).toBe(400)

    const created = await fetch('/api/diaries', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Canonical decision',
        content: 'A bounded decision record',
        date: '2026-08-20',
        reviewDueAt: '2026-08-22T12:00:00.000Z',
        transactions: [{
          symbol: 'aapl', type: 'BUY', quantity: '2.5', price: '180.25', tradeDate: '2026-08-20T09:30:00.000Z',
        }],
      }),
    })
    const createdBody = await created.json()
    expect(created.status).toBe(201)
    expect(createdBody).toMatchObject({
      id: expect.stringMatching(/^\d+$/),
      userId: expect.stringMatching(/^\d+$/),
      date: '2026-08-20',
      createdAt: expect.stringMatching(/Z$/),
      updatedAt: expect.stringMatching(/Z$/),
      reviewDueAt: expect.stringMatching(/Z$/),
      transactions: [{
        id: expect.stringMatching(/^\d+$/),
        diaryId: expect.stringMatching(/^\d+$/),
        userId: expect.stringMatching(/^\d+$/),
        quantity: '2.5',
        price: '180.25',
      }],
    })

    const duplicate = await fetch('/api/diaries', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Duplicate', content: 'Same date', date: '2026-08-20' }),
    })
    expect(duplicate.status).toBe(409)
    expect(await duplicate.json()).toMatchObject({ data: { code: 'DIARY_ALREADY_EXISTS' } })

    await $fetch('/api/diaries', {
      method: 'POST', headers, body: { title: 'Second', content: 'Page two', date: '2026-08-19' },
    })
    const page = await $fetch<any>('/api/diaries', { headers, query: { page: 1, limit: 1, sortBy: 'date-desc' } })
    expect(page.pagination).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 })
    expect(page.data).toHaveLength(1)
    expect(page.data[0].date).toBe('2026-08-20')

    await expect($fetch('/api/diaries', { headers, query: { days: 7 } }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('keeps Diary Review as one mutable owner-only post-mortem', async () => {
    const ownerHeaders = await bearerHeadersFor('native-http@example.com')
    const otherHeaders = await bearerHeadersFor('other-http@example.com')
    const list = await $fetch<any>('/api/diaries', { headers: ownerHeaders, query: { limit: 1 } })
    const diaryId = list.data[0].id

    const first = await $fetch<any>(`/api/diaries/${diaryId}/review`, {
      method: 'PATCH',
      headers: ownerHeaders,
      body: { reviewOutcome: 'PARTIAL', reviewSummary: 'Entry timing weakened the thesis.' },
    })
    expect(first).toMatchObject({ id: diaryId, reviewStatus: 'reviewed', reviewOutcome: 'PARTIAL' })
    expect(first.reviewedAt).toMatch(/Z$/)

    const edited = await $fetch<any>(`/api/diaries/${diaryId}/review`, {
      method: 'PATCH',
      headers: ownerHeaders,
      body: { reviewOutcome: 'INTACT', reviewLearning: 'The thesis survived; execution changed.' },
    })
    expect(edited).toMatchObject({ id: diaryId, reviewStatus: 'reviewed', reviewOutcome: 'INTACT' })

    await expect($fetch(`/api/diaries/${diaryId}`, { headers: otherHeaders }))
      .rejects.toMatchObject({ statusCode: 404 })
    await expect($fetch(`/api/diaries/${diaryId}/review`, { headers: otherHeaders }))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})
