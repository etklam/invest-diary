import { sessionRead, sessionWrite, sessionDelete } from '~/server/utils/telegram-db'

/**
 * Stateless Prisma-backed session adapter for grammY.
 * Each method call reads/writes directly from MySQL — no in-memory cache.
 * Compatible with Nitro's per-request serverless model.
 */

export interface SessionAdapter {
  read(key: string): Promise<Record<string, unknown> | undefined>
  write(key: string, value: Record<string, unknown>): Promise<void>
  delete(key: string): Promise<void>
}

export function createPrismaSessionAdapter(): SessionAdapter {
  return {
    read: sessionRead,
    write: sessionWrite,
    delete: sessionDelete,
  }
}
