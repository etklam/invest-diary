import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery } from '../vi-setup'

const mockUpstreamFetch = vi.fn()
const mockWarn = vi.fn()
const mockWithRequestId = vi.fn(() => ({ warn: mockWarn }))

vi.mock('~/lib/logger', () => ({
  logger: {
    api: {
      withRequestId: mockWithRequestId,
    },
  },
}))

describe('GET /api/holidays', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', mockUpstreamFetch)
    mockGetQuery.mockReturnValue({ year: '2026', countryCode: 'tw' })
  })

  it('returns holiday data from the upstream service', async () => {
    const holidays = [{ date: '2026-02-28', localName: '和平紀念日' }]
    mockUpstreamFetch.mockResolvedValue(holidays)

    const { default: handler } = await import('~/server/api/holidays.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-holidays' } } as any)

    expect(mockUpstreamFetch).toHaveBeenCalledWith(
      'https://date.nager.at/api/v3/PublicHolidays/2026/TW'
    )
    expect(result).toEqual({ success: true, data: holidays })
  })

  it('logs structured upstream payload context and returns an external-service error', async () => {
    mockUpstreamFetch.mockResolvedValue({ error: 'temporarily unavailable' })

    const { default: handler } = await import('~/server/api/holidays.get')

    await expect(
      handler({ context: { user: { id: '1' }, requestId: 'req-holidays-warning' } } as any)
    ).rejects.toMatchObject({ statusCode: 502 })

    expect(mockWarn).toHaveBeenCalledWith(
      'holiday upstream returned non-array payload',
      { year: 2026, countryCode: 'tw' }
    )
  })
})
