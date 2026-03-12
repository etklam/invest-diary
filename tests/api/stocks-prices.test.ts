import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReadBody } from '../vi-setup'

const mockRequireUser = vi.fn()
const mockGeneralApi = vi.fn()
const mockGetRequestIP = vi.fn()
const mockFetch = vi.fn()

vi.stubGlobal('fetch', mockFetch)
vi.stubGlobal('getRequestIP', mockGetRequestIP)

vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('~/lib/rate-limiter', () => ({
  rateLimiters: {
    generalApi: mockGeneralApi,
  },
}))

describe('POST /api/stocks/prices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '1', email: 'user@test.com', role: 'USER' })
    mockGetRequestIP.mockReturnValue('127.0.0.1')
  })

  it('requires authentication', async () => {
    mockRequireUser.mockImplementation(() => {
      throw Object.assign(new Error('UNAUTHORIZED'), {
        statusCode: 401,
        statusMessage: 'UNAUTHORIZED',
      })
    })
    mockReadBody.mockResolvedValue({ symbols: ['AAPL'] })

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('rejects requests with too many symbols', async () => {
    mockReadBody.mockResolvedValue({
      symbols: Array.from({ length: 26 }, (_, index) => `SYM${index}`),
    })

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(mockGeneralApi).not.toHaveBeenCalled()
  })

  it('applies rate limiting before fan-out requests', async () => {
    mockReadBody.mockResolvedValue({ symbols: ['AAPL'] })
    mockGeneralApi.mockRejectedValueOnce(new Error('limited'))

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
      statusCode: 429,
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns prices for TWSE and Yahoo symbols', async () => {
    mockReadBody.mockResolvedValue({ symbols: ['2330.TW', 'AAPL'] })
    mockGeneralApi.mockResolvedValueOnce(true)

    mockFetch
      .mockResolvedValueOnce({
        text: async () => 'prefix{"msgArray":[{"z":"123.45"}]}'
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chart: { result: [{ meta: { regularMarketPrice: 234.56 } }] },
        }),
      })

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    const result = await handler({ context: { user: { id: '1' } } } as any)

    expect(result).toEqual({ '2330.TW': 123.45, AAPL: 234.56 })
    expect(mockGeneralApi).toHaveBeenCalledWith('127.0.0.1')
  })
})
