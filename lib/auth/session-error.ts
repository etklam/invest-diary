import { ErrorCodes } from '~/lib/errors/codes'

const authSessionErrorCodes = new Set<string>([
  ErrorCodes.AUTH_UNAUTHORIZED,
  ErrorCodes.AUTH_TOKEN_EXPIRED,
  ErrorCodes.AUTH_TOKEN_INVALID,
  ErrorCodes.AUTH_TOKEN_NOT_FOUND,
  ErrorCodes.AUTH_TOKEN_REVOKED,
  ErrorCodes.AUTH_NO_REFRESH_TOKEN,
])

export function extractApiErrorCode(error: any): string | undefined {
  return error?.data?.code || error?.response?._data?.data?.code || error?.response?._data?.code
}

export function isUnauthorizedStatus(error: any): boolean {
  return error?.statusCode === 401 || error?.response?.status === 401
}

export function isAuthSessionError(error: any): boolean {
  const code = extractApiErrorCode(error)
  return isUnauthorizedStatus(error) && Boolean(code && authSessionErrorCodes.has(code))
}
