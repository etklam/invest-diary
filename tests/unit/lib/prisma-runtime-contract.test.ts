import { describe, expect, it } from 'vitest'

describe('Prisma runtime contract', () => {
  it('exports a usable Prisma client instance', async () => {
    const { default: prisma } = await import('~/lib/prisma')

    expect(typeof prisma.$connect).toBe('function')
    expect(typeof prisma.$disconnect).toBe('function')
  })
})
