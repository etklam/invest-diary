// lib/logger.ts

/**
 * Unified application logger
 * - Supports log levels
 * - Supports requestId tracing
 * - Suppresses debug logs in production
 * - Automatic PII masking for email and IP addresses
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  userId?: string
  requestId?: string
  [key: string]: unknown
}

const isDev = process.env.NODE_ENV === 'development'

/**
 * Mask an email address for privacy.
 * Converts "karl@example.com" to "ka***@ex***.com"
 */
export function maskEmail(email: string): string {
  try {
    const [localPart, domain] = email.split('@')
    if (!localPart || !domain) return '***'

    const maskedLocal = localPart.length <= 2
      ? localPart[0] + '***'
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
 * Converts "192.168.1.1" to "192.168.***.***"
 */
export function maskIp(ip: string): string {
  try {
    const parts = ip.split('.')
    if (parts.length === 4) {
      return parts[0] + '.' + parts[1] + '.***.***'
    }
    // IPv6 or other formats: mask all but first segment
    const segments = ip.split(':')
    if (segments.length > 2) {
      return segments[0] + ':' + segments[1] + ':***:***'
    }
    return '***'
  } catch {
    return '***'
  }
}

/**
 * Recursively mask PII values in a context object.
 * Scans for keys containing 'email' or 'ip' (case-insensitive) and masks their values.
 */
function maskContextPii(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      if (/email/i.test(key)) {
        result[key] = maskEmail(value)
      } else if (/ip$/i.test(key) || /ipAddr/i.test(key)) {
        result[key] = maskIp(value)
      } else {
        result[key] = value
      }
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = maskContextPii(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}
const isJsonMode = process.env.LOG_FORMAT === 'json'

class Logger {
  private prefix: string
  private requestId?: string

  constructor(prefix: string, requestId?: string) {
    this.prefix = prefix
    this.requestId = requestId
  }

  withRequestId(requestId?: string): Logger {
    if (!requestId) return this
    return new Logger(this.prefix, requestId)
  }

  private format(level: LogLevel, message: string, context?: LogContext): string {
    const ts = new Date().toISOString()
    if (isJsonMode) {
      const entry: Record<string, unknown> = {
        timestamp: ts,
        level: level.toUpperCase(),
        prefix: this.prefix,
        message,
      }
      if (this.requestId) {
        entry.requestId = this.requestId
      }
      if (context) {
        entry.context = context
      }
      return JSON.stringify(entry)
    }
    const parts = [ts, `[${this.prefix}]`, `[${level.toUpperCase()}]`]
    if (this.requestId) {
      parts.push(`[req:${this.requestId.slice(0, 8)}]`)
    }
    return parts.join(' ') + ` ${message}`
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (level === 'debug' && !isDev) return

    const maskedContext = context ? maskContextPii(context) : undefined

    if (isJsonMode) {
      const formatted = this.format(level, message, maskedContext)
      switch (level) {
        case 'debug': console.debug(formatted); break
        case 'info': console.info(formatted); break
        case 'warn': console.warn(formatted); break
        case 'error': console.error(formatted); break
      }
      return
    }

    const formatted = this.format(level, message)
    const args = maskedContext ? [formatted, maskedContext] : [formatted]

    switch (level) {
      case 'debug': console.debug(...args); break
      case 'info': console.info(...args); break
      case 'warn': console.warn(...args); break
      case 'error': console.error(...args); break
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context)
  }
}

export function createLogger(prefix: string) {
  return new Logger(prefix)
}

// Default loggers by domain
export const logger = {
  api: createLogger('API'),
  auth: createLogger('Auth'),
  db: createLogger('DB'),
  ws: createLogger('WS'),
  alert: createLogger('Alert'),
  blog: createLogger('Blog'),
  admin: createLogger('ADMIN'),
  diary: createLogger('Diary'),
  discipline: createLogger('Discipline'),
  stocks: createLogger('Stocks'),
  etf: createLogger('ETF'),
}
