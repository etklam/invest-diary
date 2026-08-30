import { ErrorCodes } from '~/lib/contracts/common/error-codes'

const authSessionErrorCodes = new Set<string>([
  ErrorCodes.AUTH_UNAUTHORIZED,
  ErrorCodes.AUTH_TOKEN_EXPIRED,
  ErrorCodes.AUTH_TOKEN_INVALID,
  ErrorCodes.AUTH_TOKEN_NOT_FOUND,
  ErrorCodes.AUTH_TOKEN_REVOKED,
  ErrorCodes.AUTH_NO_REFRESH_TOKEN,
])

interface ApiErrorLike {
  statusCode?: number
  data?: {
    code?: string
  }
  response?: {
    status?: number
    _data?: {
      code?: string
      data?: {
        code?: string
      }
    }
  }
}

function asApiErrorLike(error: unknown): ApiErrorLike | null | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }

  return error as ApiErrorLike
}

export function extractApiErrorCode(error: unknown): string | undefined {
  const apiError = asApiErrorLike(error)
  return apiError?.data?.code || apiError?.response?._data?.data?.code || apiError?.response?._data?.code
}

export function isUnauthorizedStatus(error: unknown): boolean {
  const apiError = asApiErrorLike(error)
  return apiError?.statusCode === 401 || apiError?.response?.status === 401
}

export function isAuthSessionError(error: unknown): boolean {
  const code = extractApiErrorCode(error)
  return isUnauthorizedStatus(error) && Boolean(code && authSessionErrorCodes.has(code))
}
