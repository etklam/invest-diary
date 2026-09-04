import type { Prisma } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { getDatabaseUrl } from '~/server/config/env'

export function createPrismaClientOptions(
  options: Omit<Prisma.PrismaClientOptions, 'adapter' | 'accelerateUrl'> = {}
): Prisma.PrismaClientOptions {
  return {
    ...options,
    adapter: new PrismaMariaDb(getDatabaseUrl()),
  }
}
