// lib/logger.ts

/**
 * Unified application logger
 * - Supports log levels
 * - Supports requestId tracing
 * - Suppresses debug logs in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  userId?: string
  requestId?: string
  [key: string]: unknown
}

const isDev = process.env.NODE_ENV === 'development'

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

  private format(level: LogLevel, message: string): string {
    const ts = new Date().toISOString()
    const parts = [ts, `[${this.prefix}]`, `[${level.toUpperCase()}]`]
    if (this.requestId) {
      parts.push(`[req:${this.requestId.slice(0, 8)}]`)
    }
    return parts.join(' ') + ` ${message}`
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (level === 'debug' && !isDev) return

    const formatted = this.format(level, message)
    const args = context ? [formatted, context] : [formatted]

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
}
