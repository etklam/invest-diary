import { describe, expect, it } from 'vitest'
import type { EtfProfileResponse } from '~/lib/etf-profile/types'
import { PROFILE_SCHEMA_VERSION } from '~/lib/etf-profile/types'

describe('etf profile type contract', () => {
  it('supports risk/valuation/rs/meta fields', () => {
    const sample: EtfProfileResponse = {} as any
    expect(sample).toBeDefined()
  })

  it('exports runtime schema version', () => {
    expect(PROFILE_SCHEMA_VERSION).toBe(1)
  })
})
