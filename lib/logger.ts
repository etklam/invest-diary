// lib/logger.ts

/**
 * Unified application logger.
 * - Text mode (default): readable console output with [PREFIX] [LEVEL] tags.
 * - JSON mode (LOG_FORMAT=json): structured JSON lines for log aggregators.
 * - Automatic PII masking for email/IP fields in context.
 *
 * ponytail: consola is installed (Nuxt default) but its native format doesn't
 * match the exact shape tests assert on ([PREFIX] [LEVEL] [req:xxx] msg and
 * JSON line with {timestamp,level,prefix,message,requestId,context}). Adapting
 * consola would need a custom reporter + wrapper — more code than this thin
 * shell. Kept as direct console calls; complexity ceiling: single-process.
 */

import { parseRuntimeSettings } from '~/server/config/env'
import { formatErrorContext, redactSensitiveText } from '~/lib/error-context'

export { formatErrorContext, redactSensitiveText } from '~/lib/error-context'

export interface LogContext {
  userId?: string | bigint
  requestId?: string
  [key: string]: unknown
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const SENSITIVE_CONTEXT_KEY = /password|secret|token|authorization|cookie|api[-_]?key/i

/**
 * Mask an email address for privacy.
 * "karl@example.com" -> "ka***@ex***.com"
 */
export function maskEmail(email: string): string {
  try {
    const [localPart, domain] = email.split('@')
    if (!localPart || !domain) return '***'
    const maskedLocal = localPart.length <= 2
      ? localPart[0]! + '***'
      : localPart.slice(0, 2) + '***'
    const domainParts = domain.split('.')
    const maskedDomain = domainParts.length > 1
      ? domainParts[0]!.slice(0, 2) + '***.' + domainParts.slice(1).join('.')
      : '***'
    return maskedLocal + '@' + maskedDomain
  } catch {
    return '***'
  }
}

/**
 * Mask an IP address for privacy.
 * "192.168.1.1" -> "192.168.***.***"
 */
export function maskIp(ip: string): string {
  try {
    const parts = ip.split('.')
    if (parts.length === 4) return parts[0]! + '.' + parts[1]! + '.***.***'
    const segments = ip.split(':')
    if (segments.length > 2) return segments[0]! + ':' + segments[1]! + ':***:***'
    return '***'
  } catch {
    return '***'
  }
}

/**
 * Recursively mask PII and credentials in context. Error instances are
 * normalized so JSON mode never turns them into an unhelpful `{}`.
 */
function maskContextValue(value: unknown, key: string | undefined, active: WeakSet<object>): unknown {
  if (typeof value === 'string') {
    if (key && SENSITIVE_CONTEXT_KEY.test(key)) return '***'
    if (key && /email/i.test(key)) return maskEmail(value)
    if (key && (/ip$/i.test(key) || /ipAddr/i.test(key))) return maskIp(value)
    return redactSensitiveText(value)
  }
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Error) return formatErrorContext(value)
  if (value === null || typeof value !== 'object') return value
  if (active.has(value)) return '[Circular]'

  active.add(value)
  const result = Array.isArray(value)
    ? Array.from(value, item => maskContextValue(item, undefined, active))
    : maskContextPii(value as Record<string, unknown>, active)
  active.delete(value)
  return result
}

function maskContextPii(
  obj: Record<string, unknown>,
  active: WeakSet<object> = new WeakSet(),
): Record<string, unknown> {
  const ownsActiveMarker = !active.has(obj)
  if (ownsActiveMarker) active.add(obj)
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = maskContextValue(value, key, active)
  }
  if (ownsActiveMarker) active.delete(obj)
  return result
}

const consoleFn: Record<LogLevel, (...args: unknown[]) => void> = {
  // Resolve console methods at call time so tests and hosting runtimes can
  // intercept output without relying on import order.
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
}

class Logger {
  constructor(private prefix: string, private requestId?: string) {}

  withRequestId(requestId?: string): Logger {
    if (!requestId) return this
    return new Logger(this.prefix, requestId)
  }

  debug(message: string, context?: LogContext) { this.log('debug', message, context) }
  info(message: string, context?: LogContext) { this.log('info', message, context) }
  warn(message: string, context?: LogContext) { this.log('warn', message, context) }
  error(message: string, context?: LogContext) { this.log('error', message, context) }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const runtime = parseRuntimeSettings()
    if (level === 'debug' && runtime.nodeEnv !== 'development') return
    const masked = context ? maskContextPii(context) : undefined
    const safeMessage = redactSensitiveText(message)
    const ts = new Date().toISOString()

    if (runtime.logFormat === 'json') {
      const entry: Record<string, unknown> = {
        timestamp: ts,
        level: level.toUpperCase(),
        prefix: this.prefix,
        message: safeMessage,
      }
      if (this.requestId) entry.requestId = this.requestId
      if (masked) entry.context = masked
      consoleFn[level](JSON.stringify(entry))
      return
    }

    const parts = [ts, `[${this.prefix}]`, `[${level.toUpperCase()}]`]
    if (this.requestId) parts.push(`[req:${this.requestId.slice(0, 8)}]`)
    const formatted = parts.join(' ') + ` ${safeMessage}`
    consoleFn[level](...(masked ? [formatted, masked] : [formatted]))
  }
}

export function createLogger(prefix: string): Logger {
  return new Logger(prefix)
}

export const logger = {
  api: createLogger('API'),
  auth: createLogger('Auth'),
  db: createLogger('DB'),
  ws: createLogger('WS'),
  runtime: createLogger('Runtime'),
  alert: createLogger('Alert'),
  blog: createLogger('Blog'),
  admin: createLogger('ADMIN'),
  diary: createLogger('Diary'),
  discipline: createLogger('Discipline'),
  stocks: createLogger('Stocks'),
  etf: createLogger('ETF'),
  sec: createLogger('SEC'),
}
