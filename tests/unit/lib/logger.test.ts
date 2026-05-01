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
})
