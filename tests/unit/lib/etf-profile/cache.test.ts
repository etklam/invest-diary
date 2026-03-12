import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { getCached, setCached } from '~/lib/etf-profile/cache'

describe('etf profile cache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('expires values by ttl', () => {
    setCached('k', { ok: true }, 1)

    vi.advanceTimersByTime(1100)

    expect(getCached('k')).toBeNull()
  })
})
