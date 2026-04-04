import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV

  if (ORIGINAL_DATABASE_URL === undefined) {
    delete process.env.DATABASE_URL
  } else {
    process.env.DATABASE_URL = ORIGINAL_DATABASE_URL
  }

  vi.resetModules()
})

describe('Prisma runtime contract', () => {
  it('exports a usable Prisma client instance', async () => {
    const { default: prisma } = await import('~/lib/prisma')

    expect(typeof prisma.$connect).toBe('function')
    expect(typeof prisma.$disconnect).toBe('function')
  })

  it('can be imported in production without DATABASE_URL until first use', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.DATABASE_URL
    vi.resetModules()

    await expect(import('~/lib/prisma')).resolves.toMatchObject({
      default: expect.anything(),
    })
  })

  it('reuses the same lazy Prisma client in production after first access', async () => {
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = 'mysql://root:password@localhost:3306/test'
    vi.resetModules()

    const { default: prisma } = await import('~/lib/prisma')

    expect(prisma.user).toBe(prisma.user)
  })
})
