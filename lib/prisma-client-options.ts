import type { Prisma } from '@prisma/client'
import { PrismaMySQL } from '@prisma/adapter-mysql'

const TEST_DATABASE_URL = 'mysql://root:password@localhost:3306/test'

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return TEST_DATABASE_URL
  }

  throw new Error('DATABASE_URL is required for Prisma client initialization')
}

export function createPrismaClientOptions(
  options: Omit<Prisma.PrismaClientOptions, 'adapter' | 'accelerateUrl'> = {}
): Prisma.PrismaClientOptions {
  return {
    ...options,
    adapter: new PrismaMySQL(getDatabaseUrl()),
  }
}
