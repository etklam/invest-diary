import { describe, expect, it } from 'vitest'
import { ErrorCodes } from '~/lib/errors/codes'
import { ALL_ERROR_CODES, errorCodeToI18nKey } from '~/lib/errors/i18n-mapping'

describe('errorCodeToI18nKey', () => {
  it('converts AUTH_UNAUTHORIZED to lowercase dotted key', () => {
    expect(errorCodeToI18nKey(ErrorCodes.AUTH_UNAUTHORIZED)).toBe('error.code.auth_unauthorized')
  })

  it('converts AUTH_LOGIN_INVALID_CREDENTIALS', () => {
    expect(errorCodeToI18nKey(ErrorCodes.AUTH_LOGIN_INVALID_CREDENTIALS)).toBe('error.code.auth_login_invalid_credentials')
  })

  it('converts AUTH_TOKEN_EXPIRED', () => {
    expect(errorCodeToI18nKey(ErrorCodes.AUTH_TOKEN_EXPIRED)).toBe('error.code.auth_token_expired')
  })

  it('converts SYS_INTERNAL_ERROR', () => {
    expect(errorCodeToI18nKey(ErrorCodes.SYS_INTERNAL_ERROR)).toBe('error.code.sys_internal_error')
  })

  it('converts DIARY_NOT_FOUND', () => {
    expect(errorCodeToI18nKey(ErrorCodes.DIARY_NOT_FOUND)).toBe('error.code.diary_not_found')
  })

  it('converts ETF_ALREADY_IN_WATCHLIST', () => {
    expect(errorCodeToI18nKey(ErrorCodes.ETF_ALREADY_IN_WATCHLIST)).toBe('error.code.etf_already_in_watchlist')
  })

  it('always produces lowercase keys for any code', () => {
    for (const code of ALL_ERROR_CODES) {
      const key = errorCodeToI18nKey(code)
      expect(key).toBe(key.toLowerCase())
      expect(key).toMatch(/^error\.code\.[a-z_]+$/)
    }
  })
})

describe('ALL_ERROR_CODES', () => {
  it('contains exactly 27 error codes', () => {
    expect(ALL_ERROR_CODES).toHaveLength(27)
  })

  it('includes all auth codes', () => {
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.AUTH_UNAUTHORIZED)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.AUTH_LOGIN_INVALID_CREDENTIALS)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.AUTH_TOKEN_EXPIRED)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.AUTH_TOKEN_INVALID)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.AUTH_TOKEN_NOT_FOUND)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.AUTH_TOKEN_REVOKED)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.AUTH_NO_REFRESH_TOKEN)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.AUTH_RATE_LIMITED)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.AUTH_API_KEY_INVALID)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.AUTH_API_KEY_REVOKED)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.AUTH_API_KEY_SCOPE_DENIED)
  })

  it('includes all diary codes', () => {
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.DIARY_NOT_FOUND)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.DIARY_ACCESS_DENIED)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.DIARY_ALREADY_EXISTS)
  })

  it('includes all partner codes', () => {
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.PARTNER_LINK_NOT_FOUND)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.PARTNER_LINK_ACCESS_DENIED)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.PARTNER_LINK_ALREADY_EXISTS)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.PARTNER_LINK_PENDING)
  })

  it('includes all alert codes', () => {
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.ALERT_NOT_FOUND)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.ALERT_ACCESS_DENIED)
  })

  it('includes all ETF codes', () => {
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.ETF_NOT_FOUND)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.ETF_ALREADY_IN_WATCHLIST)
  })

  it('includes all user codes', () => {
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.USER_NOT_FOUND)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.USER_EMAIL_EXISTS)
  })

  it('includes blog code', () => {
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.BLOG_NOT_FOUND)
  })

  it('includes system codes', () => {
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.SYS_INTERNAL_ERROR)
    expect(ALL_ERROR_CODES).toContain(ErrorCodes.SYS_VALIDATION_ERROR)
  })
})
