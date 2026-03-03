import { describe, expect, it } from 'vitest'
import { getCached, setCached } from '~/lib/etf-profile/cache'

describe('etf profile cache', () => {
  it('expires values by ttl', async () => {
    setCached('k', { ok: true }, 1)
    await new Promise(resolve => setTimeout(resolve, 1100))
    expect(getCached('k')).toBeNull()
  })
})
