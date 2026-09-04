import { afterEach, describe, expect, it, vi } from 'vitest'

const originalLogFormat = process.env.LOG_FORMAT

describe('logger', () => {
  afterEach(() => {
    if (originalLogFormat === undefined) {
      delete process.env.LOG_FORMAT
    } else {
      process.env.LOG_FORMAT = originalLogFormat
    }
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('emits parseable JSON logs when LOG_FORMAT=json', async () => {
    process.env.LOG_FORMAT = 'json'
    vi.resetModules()
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { createLogger } = await import('~/lib/logger')

    createLogger('Auth')
      .withRequestId('request-123456')
      .info('Login success', {
        email: 'karl@example.com',
        ip: '192.168.1.25',
        nested: {
          userEmail: 'ab@example.com',
        },
      })

    expect(infoSpy).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(String(infoSpy.mock.calls[0]?.[0]))

    expect(payload).toMatchObject({
      level: 'INFO',
      prefix: 'Auth',
      message: 'Login success',
      requestId: 'request-123456',
      context: {
        email: 'ka***@ex***.com',
        ip: '192.168.***.***',
        nested: {
          userEmail: 'a***@ex***.com',
        },
      },
    })
    expect(typeof payload.timestamp).toBe('string')
  })

  it('keeps text logs backward-compatible outside JSON mode', async () => {
    delete process.env.LOG_FORMAT
    vi.resetModules()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { createLogger } = await import('~/lib/logger')

    createLogger('API').withRequestId('abcdef123456').warn('Rate limited', {
      ip: '10.0.1.2',
    })

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('[API] [WARN] [req:abcdef12] Rate limited')
    expect(warnSpy.mock.calls[0]?.[1]).toEqual({
      ip: '10.0.***.***',
    })
  })

  it('serializes errors and redacts credentials from structured context', async () => {
    vi.resetModules()
    const { formatErrorContext } = await import('~/lib/logger')

    const context = formatErrorContext(new Error(
      'request failed for mysql://db_user:super-secret@db.example/app with Bearer abc.def.ghi',
    ))

    expect(context.error).toContain('mysql://db_user:***@db.example/app')
    expect(context.error).toContain('Bearer ***')
    expect(context.error).not.toContain('super-secret')
    expect(context.errorType).toBe('Error')
    expect(context.stack).toBeDefined()
  })

  it('masks password and token fields instead of logging their values', async () => {
    process.env.LOG_FORMAT = 'json'
    vi.resetModules()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { createLogger } = await import('~/lib/logger')

    createLogger('Auth').error('Authentication failure', {
      password: 'super-secret-password',
      token: 'jwt-token-value',
    })

    const payload = JSON.parse(String(errorSpy.mock.calls[0]?.[0]))
    expect(payload.context).toEqual({ password: '***', token: '***' })
    expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain('super-secret-password')
    expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain('jwt-token-value')
  })

  it('emits searchable production error fields without leaking credentials', async () => {
    process.env.LOG_FORMAT = 'json'
    vi.resetModules()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { createLogger, formatErrorContext } = await import('~/lib/logger')

    createLogger('Alert').error('Scheduler failure', {
      operation: 'alert_scheduler_tick',
      jobId: 'job-123',
      ...formatErrorContext(new Error('failed with Bearer abc.def.ghi')),
      token: 'must-not-escape',
    })

    const payload = JSON.parse(String(errorSpy.mock.calls[0]?.[0]))
    expect(payload).toMatchObject({
      level: 'ERROR',
      prefix: 'Alert',
      context: {
        operation: 'alert_scheduler_tick',
        jobId: 'job-123',
        errorType: 'Error',
        error: 'failed with Bearer ***',
        token: '***',
      },
    })
    expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain('abc.def.ghi')
    expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain('must-not-escape')
  })

  it('redacts credentials embedded in error-shaped values and messages', async () => {
    process.env.LOG_FORMAT = 'json'
    vi.resetModules()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { createLogger, formatErrorContext } = await import('~/lib/logger')

    const formatted = formatErrorContext({ password: 'object-secret', nested: { token: 'nested-secret' } })
    createLogger('API').error('failed with PASSWORD=message-secret', formatted)

    const output = String(errorSpy.mock.calls[0]?.[0])
    expect(output).not.toContain('object-secret')
    expect(output).not.toContain('nested-secret')
    expect(output).not.toContain('message-secret')
    expect(output).toContain('***')
  })

  it('serializes BigInt values in JSON log context', async () => {
    process.env.LOG_FORMAT = 'json'
    vi.resetModules()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { createLogger } = await import('~/lib/logger')

    createLogger('DB').error('Persistence boundary failure', {
      userId: 9007199254740993n,
      ids: [1n, 2n],
    })

    const payload = JSON.parse(String(errorSpy.mock.calls[0]?.[0]))
    expect(payload.context).toEqual({ userId: '9007199254740993', ids: ['1', '2'] })
  })

  it('keeps cyclic context safe and parseable', async () => {
    process.env.LOG_FORMAT = 'json'
    vi.resetModules()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { createLogger } = await import('~/lib/logger')
    const context: Record<string, unknown> = { operation: 'cycle-test' }
    context.self = context

    expect(() => createLogger('Runtime').error('cycle', context)).not.toThrow()
    const payload = JSON.parse(String(errorSpy.mock.calls[0]?.[0]))
    expect(payload.context).toEqual({ operation: 'cycle-test', self: '[Circular]' })
  })
})
