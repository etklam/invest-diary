import { describe, expect, it } from 'vitest'
import { ErrorCodes } from '~/lib/errors/codes'
import { extractApiErrorCode, isAuthSessionError, isUnauthorizedStatus } from '~/lib/auth/session-error'

describe('auth session error helpers', () => {
  it('extracts machine-readable auth codes from API errors', () => {
    expect(extractApiErrorCode({
      data: {
        code: ErrorCodes.AUTH_TOKEN_EXPIRED,
      },
    })).toBe(ErrorCodes.AUTH_TOKEN_EXPIRED)

    expect(extractApiErrorCode({
      response: {
        _data: {
          data: {
            code: ErrorCodes.AUTH_TOKEN_REVOKED,
          },
        },
      },
    })).toBe(ErrorCodes.AUTH_TOKEN_REVOKED)
  })

  it('treats only auth session codes as recoverable auth errors', () => {
    expect(isAuthSessionError({
      statusCode: 401,
      data: {
        code: ErrorCodes.AUTH_TOKEN_EXPIRED,
      },
    })).toBe(true)

    expect(isAuthSessionError({
      statusCode: 401,
      data: {
        code: ErrorCodes.AUTH_UNAUTHORIZED,
      },
    })).toBe(true)

    expect(isAuthSessionError({
      statusCode: 401,
      data: {
        code: ErrorCodes.AUTH_LOGIN_INVALID_CREDENTIALS,
      },
    })).toBe(false)

    expect(isAuthSessionError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })).toBe(false)
  })

  it('recognizes unauthorized status across direct and response-wrapped errors', () => {
    expect(isUnauthorizedStatus({ statusCode: 401 })).toBe(true)
    expect(isUnauthorizedStatus({ response: { status: 401 } })).toBe(true)
    expect(isUnauthorizedStatus({ statusCode: 500 })).toBe(false)
  })
})
