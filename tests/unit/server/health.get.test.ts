import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockSetResponseStatus } from '../../vi-setup'

const mockQueryRaw = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    $queryRaw: mockQueryRaw,
  },
}))

describe('server/api/health.get', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockQueryRaw.mockResolvedValue([{ ok: 1 }])
  })

  it('returns a healthy payload with backward-compatible metadata', async () => {
    const { default: handler } = await import('~/server/api/health.get')

    const result = await handler({ context: {} } as any)

    expect(result).toMatchObject({
      status: 'healthy',
      checks: {
        database: {
          status: 'ok',
        },
        server: {
          status: 'ok',
          environment: expect.any(String),
        },
      },
    })
    expect(result.checks.database.responseTime).toEqual(expect.any(Number))
    expect(mockSetResponseStatus).not.toHaveBeenCalled()
  })

  it('returns 503 and includes the database error message when unhealthy', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('DB unavailable'))
    const { default: handler } = await import('~/server/api/health.get')
    const event = { context: {} } as any

    const result = await handler(event)

    expect(mockSetResponseStatus).toHaveBeenCalledWith(event, 503, 'Service Unavailable')
    expect(result).toMatchObject({
      status: 'unhealthy',
      checks: {
        database: {
          status: 'error',
          message: 'DB unavailable',
        },
        server: {
          status: 'ok',
        },
      },
    })
  })
})
