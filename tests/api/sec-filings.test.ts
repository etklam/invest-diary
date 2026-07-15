import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery } from '../vi-setup'

const { searchCompanies } = vi.hoisted(() => ({ searchCompanies: vi.fn() }))
vi.mock('~/server/utils/sec-edgar/runtime', () => ({ getSecEdgarService: () => ({ searchCompanies }) }))
vi.mock('~/server/utils/sec-edgar/http', () => ({
  enforceSecRateLimit: vi.fn(),
  secRequestLog: () => ({ warn: vi.fn(), error: vi.fn() }),
  handleSecApiError: (error: unknown) => { throw error },
}))

describe('GET /api/tools/sec-filings/companies', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a stable data and cache metadata envelope', async () => {
    mockGetQuery.mockReturnValue({ q: 'aapl', limit: '10' })
    searchCompanies.mockResolvedValue({ value: [{ cik: '0000320193', name: 'Apple Inc.', tickers: ['AAPL'], exchanges: ['Nasdaq'], matchedBy: 'ticker' }], stale: false, cacheStatus: 'miss', fetchedAt: '2026-01-01T00:00:00.000Z' })
    const { default: handler } = await import('~/server/api/tools/sec-filings/companies.get')
    await expect(handler({ context: { requestId: 'sec-test' } } as never)).resolves.toEqual({
      data: [expect.objectContaining({ cik: '0000320193' })],
      meta: { stale: false, cacheStatus: 'miss', fetchedAt: '2026-01-01T00:00:00.000Z' },
    })
  })
})
