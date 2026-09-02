import { describe, expect, it } from 'vitest'
import { ErrorCodes } from '~/lib/contracts/common/error-codes'
import { ALL_ERROR_CODES, errorCodeToI18nKey } from '~/lib/errors/i18n-mapping'

// ponytail: parity of codes → locale keys is enforced by i18n-parity.test.ts.
// Here we only document the function's contract (lowercase dotted key shape)
// and lock the ErrorCode count so adding a code without updating locales fails fast.

describe('errorCodeToI18nKey', () => {
  it('lowercases the code and namespaces it under error.code', () => {
    expect(errorCodeToI18nKey(ErrorCodes.AUTH_UNAUTHORIZED)).toBe('error.code.auth_unauthorized')
    expect(errorCodeToI18nKey(ErrorCodes.SYS_INTERNAL_ERROR)).toBe('error.code.sys_internal_error')
  })

  it('every defined ErrorCode produces a lowercase error.code.* key', () => {
    expect(ALL_ERROR_CODES.length, 'ErrorCodes went empty — check lib/contracts/common/error-codes.ts').toBeGreaterThan(0)
    for (const code of ALL_ERROR_CODES) {
      const key = errorCodeToI18nKey(code)
      expect(key).toBe(key.toLowerCase())
      expect(key).toMatch(/^error\.code\.[a-z_]+$/)
    }
  })
})

describe('ALL_ERROR_CODES sanity', () => {
  // Locks the count so new ErrorCodes go through i18n-parity intentionally.
  // Update this number when adding/removing a code.
  it('contains the expected number of codes (bump intentionally when codes change)', () => {
    expect(ALL_ERROR_CODES).toHaveLength(54)
  })

  it('each ErrorCodes value is unique', () => {
    expect(new Set(ALL_ERROR_CODES).size).toBe(ALL_ERROR_CODES.length)
  })
})
