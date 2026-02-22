/**
 * Simple logging utility with log levels
 * In production, debug logs are suppressed
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const isDev = process.env.NODE_ENV === 'development'

class Logger {
  private prefix: string

  constructor(prefix: string) {
    this.prefix = prefix
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${this.prefix}]`

    switch (level) {
      case 'debug':
        if (isDev) {
          console.debug(prefix, message, ...args)
        }
        break
      case 'info':
        console.info(prefix, message, ...args)
        break
      case 'warn':
        console.warn(prefix, message, ...args)
        break
      case 'error':
        console.error(prefix, message, ...args)
        break
    }
  }

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args)
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args)
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args)
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args)
  }
}

/**
 * Create a logger instance with a specific prefix
 */
export function createLogger(prefix: string): Logger {
  return new Logger(prefix)
}

// Default logger instances
export const logger = {
  ws: createLogger('WS'),
  alert: createLogger('Alert'),
  auth: createLogger('Auth'),
  db: createLogger('DB'),
}
