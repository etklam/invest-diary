import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery, mockSetHeader } from '../../vi-setup'

const mockApiWithRequestId = vi.fn(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    api: {
      withRequestId: mockApiWithRequestId,
    },
  },
}))

describe('server/api/og/discipline.svg.get', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockGetQuery.mockReset()
  })

  it('returns an SVG image with cache-friendly public headers', async () => {
    mockGetQuery.mockReturnValue({
      title: '我的投資紀律',
      author: 'Kai',
    })

    const { default: handler } = await import('~/server/api/og/discipline.svg.get')
    const result = await handler({ context: { requestId: 'req-og' } } as any)

    expect(mockSetHeader).toHaveBeenCalledWith(expect.anything(), 'Content-Type', 'image/svg+xml; charset=utf-8')
    expect(mockSetHeader).toHaveBeenCalledWith(
      expect.anything(),
      'Cache-Control',
      expect.stringContaining('public')
    )
    expect(typeof result).toBe('string')
    expect(result).toContain('<svg')
    expect(result).toContain('我的投資紀律')
    expect(result).toContain('by Kai')
  })

  it('escapes user-controlled title and author before writing SVG text', async () => {
    mockGetQuery.mockReturnValue({
      title: '<script>alert("x")</script> & plan',
      author: 'A&B <boss>',
    })

    const { default: handler } = await import('~/server/api/og/discipline.svg.get')
    const result = await handler({ context: { requestId: 'req-og' } } as any)

    expect(result).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; plan')
    expect(result).toContain('A&amp;B &lt;boss&gt;')
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('A&B <boss>')
  })
})
