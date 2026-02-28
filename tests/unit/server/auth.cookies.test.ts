import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockSetCookie } from '../../vi-setup'

describe('server/utils/auth cookies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should set access token cookie for 1 hour and refresh token cookie for 30 days', async () => {
    const { setAuthCookies } = await import('~/server/utils/auth')
    const event = { context: {} } as any

    setAuthCookies(event, 'access-token-value', 'refresh-token-value')

    expect(mockSetCookie).toHaveBeenCalledWith(
      event,
      'access-token',
      'access-token-value',
      expect.objectContaining({ maxAge: 60 * 60 })
    )
    expect(mockSetCookie).toHaveBeenCalledWith(
      event,
      'refresh-token',
      'refresh-token-value',
      expect.objectContaining({ maxAge: 60 * 60 * 24 * 30 })
    )
  })

  it('should set refreshed access token cookie for 1 hour', async () => {
    const { setAccessTokenCookie } = await import('~/server/utils/auth')
    const event = { context: {} } as any

    setAccessTokenCookie(event, 'new-access-token')

    expect(mockSetCookie).toHaveBeenCalledWith(
      event,
      'access-token',
      'new-access-token',
      expect.objectContaining({ maxAge: 60 * 60 })
    )
  })
})
