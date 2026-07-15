// lib/errors/factory.ts

import { createError, H3Error } from 'h3'
import { ErrorCodes, type ErrorCode } from './codes'

interface ErrorDetail {
  field?: string
  message?: string
  value?: unknown
}

interface AppErrorOptions {
  statusCode: number
  code: ErrorCode
  message: string
  details?: ErrorDetail[]
  cause?: unknown
}

export class AppError extends Error {
  statusCode: number
  code: ErrorCode
  details?: ErrorDetail[]

  constructor(options: AppErrorOptions) {
    super(options.message)
    this.statusCode = options.statusCode
    this.code = options.code
    this.details = options.details
    this.cause = options.cause
  }

  toH3Error(): H3Error {
    return createError({
      statusCode: this.statusCode,
      statusMessage: this.message,
      data: {
        code: this.code,
        details: this.details ?? null,
      },
    })
  }
}

export const Errors = {
  // Auth
  invalidCredentials: () => new AppError({
    statusCode: 401,
    code: ErrorCodes.AUTH_LOGIN_INVALID_CREDENTIALS,
    message: 'Invalid email or password',
  }),

  unauthorized: () => new AppError({
    statusCode: 401,
    code: ErrorCodes.AUTH_UNAUTHORIZED,
    message: 'Authentication required',
  }),

  noRefreshToken: () => new AppError({
    statusCode: 401,
    code: ErrorCodes.AUTH_NO_REFRESH_TOKEN,
    message: 'No refresh token provided',
  }),

  tokenExpired: () => new AppError({
    statusCode: 401,
    code: ErrorCodes.AUTH_TOKEN_EXPIRED,
    message: 'Token expired',
  }),

  tokenInvalid: () => new AppError({
    statusCode: 401,
    code: ErrorCodes.AUTH_TOKEN_INVALID,
    message: 'Invalid token',
  }),

  tokenNotFound: () => new AppError({
    statusCode: 401,
    code: ErrorCodes.AUTH_TOKEN_NOT_FOUND,
    message: 'Token not found',
  }),

  rateLimited: (retryAfter?: number) => new AppError({
    statusCode: 429,
    code: ErrorCodes.AUTH_RATE_LIMITED,
    message: 'Too many requests. Please try again later.',
    details: retryAfter ? [{ message: `Retry after ${retryAfter} seconds` }] : undefined,
  }),

  apiKeyInvalid: () => new AppError({
    statusCode: 401,
    code: ErrorCodes.AUTH_API_KEY_INVALID,
    message: 'Invalid API key',
  }),

  apiKeyRevoked: () => new AppError({
    statusCode: 401,
    code: ErrorCodes.AUTH_API_KEY_REVOKED,
    message: 'API key has been revoked',
  }),

  apiKeyScopeDenied: () => new AppError({
    statusCode: 403,
    code: ErrorCodes.AUTH_API_KEY_SCOPE_DENIED,
    message: 'API key scope denied',
  }),

  // Diary
  diaryNotFound: (id: string) => new AppError({
    statusCode: 404,
    code: ErrorCodes.DIARY_NOT_FOUND,
    message: `Diary ${id} not found`,
  }),

  diaryAccessDenied: () => new AppError({
    statusCode: 403,
    code: ErrorCodes.DIARY_ACCESS_DENIED,
    message: 'Diary access denied',
  }),

  diaryAlreadyExists: (date: string) => new AppError({
    statusCode: 409,
    code: ErrorCodes.DIARY_ALREADY_EXISTS,
    message: `Diary already exists for ${date}`,
  }),

  partnerLinkNotFound: () => new AppError({
    statusCode: 404,
    code: ErrorCodes.PARTNER_LINK_NOT_FOUND,
    message: 'Partner link not found',
  }),

  partnerLinkAccessDenied: () => new AppError({
    statusCode: 403,
    code: ErrorCodes.PARTNER_LINK_ACCESS_DENIED,
    message: 'Partner link access denied',
  }),

  partnerLinkAlreadyExists: () => new AppError({
    statusCode: 409,
    code: ErrorCodes.PARTNER_LINK_ALREADY_EXISTS,
    message: 'Partner link already exists',
  }),

  partnerLinkPending: () => new AppError({
    statusCode: 409,
    code: ErrorCodes.PARTNER_LINK_PENDING,
    message: 'Partner link is still pending acceptance',
  }),

  // Alert
  alertNotFound: (id: string) => new AppError({
    statusCode: 404,
    code: ErrorCodes.ALERT_NOT_FOUND,
    message: `Alert ${id} not found`,
  }),

  // ETF
  etfNotFound: (symbol: string) => new AppError({
    statusCode: 404,
    code: ErrorCodes.ETF_NOT_FOUND,
    message: `ETF ${symbol} not found`,
  }),

  etfAlreadyInWatchlist: (symbol: string) => new AppError({
    statusCode: 409,
    code: ErrorCodes.ETF_ALREADY_IN_WATCHLIST,
    message: `ETF ${symbol} already in watchlist`,
  }),

  // User
  userNotFound: () => new AppError({
    statusCode: 404,
    code: ErrorCodes.USER_NOT_FOUND,
    message: 'User not found',
  }),

  userEmailExists: (email: string) => new AppError({
    statusCode: 409,
    code: ErrorCodes.USER_EMAIL_EXISTS,
    message: `Email ${email} already registered`,
  }),

  // Blog
  blogNotFound: (slug: string) => new AppError({
    statusCode: 404,
    code: ErrorCodes.BLOG_NOT_FOUND,
    message: `Blog post ${slug} not found`,
  }),

  // Discipline
  disciplineNotFound: () => new AppError({
    statusCode: 404,
    code: ErrorCodes.DISCIPLINE_NOT_FOUND,
    message: 'Discipline not found',
  }),

  // Stock Note
  stockNoteNotFound: () => new AppError({
    statusCode: 404,
    code: ErrorCodes.STOCK_NOTE_NOT_FOUND,
    message: 'Note not found',
  }),

  stockNoteAccessDenied: (action: string) => new AppError({
    statusCode: 403,
    code: ErrorCodes.STOCK_NOTE_ACCESS_DENIED,
    message: `Cannot ${action} agent-created notes`,
  }),

  // Generic
  forbidden: (message?: string) => new AppError({
    statusCode: 403,
    code: ErrorCodes.AUTH_FORBIDDEN,
    message: message ?? 'Forbidden',
  }),

  csrfFailed: () => new AppError({
    statusCode: 403,
    code: ErrorCodes.CSRF_FAILED,
    message: 'CSRF token validation failed',
  }),

  notFound: (message?: string) => new AppError({
    statusCode: 404,
    code: ErrorCodes.SYS_NOT_FOUND,
    message: message ?? 'Resource not found',
  }),

  // System
  validationError: (details: ErrorDetail[]) => new AppError({
    statusCode: 400,
    code: ErrorCodes.SYS_VALIDATION_ERROR,
    message: 'Validation failed',
    details,
  }),

  internalError: (cause?: unknown) => new AppError({
    statusCode: 500,
    code: ErrorCodes.SYS_INTERNAL_ERROR,
    message: 'Internal server error',
    cause,
  }),

  externalServiceError: (message?: string) => new AppError({
    statusCode: 502,
    code: ErrorCodes.SYS_EXTERNAL_SERVICE_ERROR,
    message: message ?? 'External service unavailable',
  }),

  secProvider: (code: ErrorCode, statusCode: number, message: string, details?: ErrorDetail[]) => new AppError({
    statusCode,
    code,
    message,
    details,
  }),

  // User
  accountSelfModification: (action: string) => new AppError({
    statusCode: 400,
    code: ErrorCodes.USER_SELF_MODIFICATION,
    message: `Cannot ${action} your own account`,
  }),
}
