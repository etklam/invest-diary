import { z } from 'zod'

/**
 * Stable error codes exposed by the API.
 *
 * Keep this module transport- and framework-neutral so every client can use
 * the same error vocabulary without importing server implementation details.
 */
export const ErrorCodes = {
  // Auth
  AUTH_LOGIN_INVALID_CREDENTIALS: 'AUTH_LOGIN_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_NOT_FOUND: 'AUTH_TOKEN_NOT_FOUND',
  AUTH_TOKEN_REVOKED: 'AUTH_TOKEN_REVOKED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_NO_REFRESH_TOKEN: 'AUTH_NO_REFRESH_TOKEN',
  AUTH_RATE_LIMITED: 'AUTH_RATE_LIMITED',
  AUTH_API_KEY_INVALID: 'AUTH_API_KEY_INVALID',
  AUTH_API_KEY_REVOKED: 'AUTH_API_KEY_REVOKED',
  AUTH_API_KEY_SCOPE_DENIED: 'AUTH_API_KEY_SCOPE_DENIED',

  // Diary
  DIARY_NOT_FOUND: 'DIARY_NOT_FOUND',
  DIARY_ALREADY_EXISTS: 'DIARY_ALREADY_EXISTS',

  // Partner
  PARTNER_LINK_NOT_FOUND: 'PARTNER_LINK_NOT_FOUND',
  PARTNER_LINK_ACCESS_DENIED: 'PARTNER_LINK_ACCESS_DENIED',
  PARTNER_LINK_ALREADY_EXISTS: 'PARTNER_LINK_ALREADY_EXISTS',
  PARTNER_LINK_PENDING: 'PARTNER_LINK_PENDING',

  // Alert
  ALERT_NOT_FOUND: 'ALERT_NOT_FOUND',
  ALERT_ACCESS_DENIED: 'ALERT_ACCESS_DENIED',

  // ETF
  ETF_NOT_FOUND: 'ETF_NOT_FOUND',
  ETF_ALREADY_IN_WATCHLIST: 'ETF_ALREADY_IN_WATCHLIST',

  // User
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_EMAIL_EXISTS: 'USER_EMAIL_EXISTS',

  // Blog
  BLOG_NOT_FOUND: 'BLOG_NOT_FOUND',

  // Discipline
  DISCIPLINE_NOT_FOUND: 'DISCIPLINE_NOT_FOUND',

  // Stock Note
  STOCK_NOTE_NOT_FOUND: 'STOCK_NOTE_NOT_FOUND',
  STOCK_NOTE_ACCESS_DENIED: 'STOCK_NOTE_ACCESS_DENIED',

  // Investment / research resources
  INVESTMENT_THESIS_NOT_FOUND: 'INVESTMENT_THESIS_NOT_FOUND',
  INVESTMENT_THESIS_NOT_ACTIVE: 'INVESTMENT_THESIS_NOT_ACTIVE',
  THESIS_REVIEW_NOT_FOUND: 'THESIS_REVIEW_NOT_FOUND',
  TRADE_PLAN_NOT_FOUND: 'TRADE_PLAN_NOT_FOUND',
  PRICE_ALERT_NOT_FOUND: 'PRICE_ALERT_NOT_FOUND',
  WATCHLIST_ITEM_NOT_FOUND: 'WATCHLIST_ITEM_NOT_FOUND',
  INVALID_CURSOR: 'INVALID_CURSOR',

  // Generic
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  CSRF_FAILED: 'CSRF_FAILED',

  // System
  SYS_INTERNAL_ERROR: 'SYS_INTERNAL_ERROR',
  SYS_VALIDATION_ERROR: 'SYS_VALIDATION_ERROR',
  SYS_NOT_FOUND: 'SYS_NOT_FOUND',
  SYS_EXTERNAL_SERVICE_ERROR: 'SYS_EXTERNAL_SERVICE_ERROR',

  // SEC EDGAR
  SEC_CONFIG_MISSING: 'SEC_CONFIG_MISSING',
  SEC_VALIDATION_ERROR: 'SEC_VALIDATION_ERROR',
  SEC_COMPANY_NOT_FOUND: 'SEC_COMPANY_NOT_FOUND',
  SEC_FILING_NOT_FOUND: 'SEC_FILING_NOT_FOUND',
  SEC_DOCUMENT_NOT_FOUND: 'SEC_DOCUMENT_NOT_FOUND',
  SEC_UPSTREAM_RATE_LIMITED: 'SEC_UPSTREAM_RATE_LIMITED',
  SEC_UPSTREAM_UNAVAILABLE: 'SEC_UPSTREAM_UNAVAILABLE',
  SEC_UPSTREAM_INVALID_RESPONSE: 'SEC_UPSTREAM_INVALID_RESPONSE',
  SEC_QUEUE_FULL: 'SEC_QUEUE_FULL',
  SEC_UNSAFE_REDIRECT: 'SEC_UNSAFE_REDIRECT',
  SEC_FILE_TOO_LARGE: 'SEC_FILE_TOO_LARGE',
  SEC_PACKAGE_LIMIT_EXCEEDED: 'SEC_PACKAGE_LIMIT_EXCEEDED',
  SEC_RATE_LIMITED: 'SEC_RATE_LIMITED',

  // User
  USER_SELF_MODIFICATION: 'USER_SELF_MODIFICATION',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

export interface ErrorDetail {
  field?: string
  message?: string
  value?: unknown
}

export interface ApiErrorData {
  code: ErrorCode
  details: ErrorDetail[] | null
  requestId: string
}

export interface ApiErrorResponse {
  statusCode: number
  statusMessage: string
  data: ApiErrorData
}

/** Canonical H3 error payload used by generated clients and API docs. */
export const apiErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string().optional(),
  value: z.unknown().optional(),
}).strict()

export const apiErrorDataSchema = z.object({
  code: z.enum(Object.values(ErrorCodes) as [ErrorCode, ...ErrorCode[]]),
  details: z.array(apiErrorDetailSchema).nullable(),
  requestId: z.string().min(1),
}).strict()

export const apiErrorResponseSchema = z.object({
  statusCode: z.number().int().min(400).max(599),
  statusMessage: z.string(),
  data: apiErrorDataSchema,
}).strict()
