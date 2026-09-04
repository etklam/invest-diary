import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runtimeError: vi.fn(),
  reportError: vi.fn(),
}))

vi.mock('~/lib/logger', () => ({
  formatErrorContext: (error: unknown) => ({
    error: error instanceof Error ? error.message : String(error),
    errorType: error instanceof Error ? error.name : typeof error,
  }),
  logger: {
    runtime: {
      error: mocks.runtimeError,
      warn: vi.fn(),
    },
  },
}))

vi.mock('~/lib/observability', () => ({
  reportError: mocks.reportError,
}))

describe('runtime config process error observers', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalDatabaseUrl = process.env.DATABASE_URL
  const originalJwtSecret = process.env.JWT_SECRET
  const originalSiteUrl = process.env.NUXT_PUBLIC_SITE_URL
  const originalSchedulerEnabled = process.env.SCHEDULER_ENABLED
  let close: (() => void) | undefined
  let beforeMonitor: Function[] = []
  let beforeRejection: Function[] = []

  afterEach(() => {
    close?.()
    close = undefined
    expect(process.listeners('uncaughtExceptionMonitor')).toEqual(beforeMonitor)
    expect(process.listeners('unhandledRejection')).toEqual(beforeRejection)
    if (originalSchedulerEnabled === undefined) delete process.env.SCHEDULER_ENABLED
    else process.env.SCHEDULER_ENABLED = originalSchedulerEnabled
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = originalDatabaseUrl
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = originalJwtSecret
    if (originalSiteUrl === undefined) delete process.env.NUXT_PUBLIC_SITE_URL
    else process.env.NUXT_PUBLIC_SITE_URL = originalSiteUrl
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('logs and reports uncaught failures, then removes observers on Nitro close', async () => {
    process.env.SCHEDULER_ENABLED = 'false'
    vi.stubGlobal('defineNitroPlugin', (plugin: any) => plugin)

    beforeMonitor = process.listeners('uncaughtExceptionMonitor')
    beforeRejection = process.listeners('unhandledRejection')
    const plugin = (await import('~/server/plugins/00-runtime-config')).default

    plugin({
      hooks: {
        hook: (name: string, handler: (...args: any[]) => any) => {
          if (name === 'close') close = handler
          return () => {}
        },
      },
    } as any)

    const monitor = process.listeners('uncaughtExceptionMonitor').find(
      listener => !beforeMonitor.includes(listener),
    ) as ((error: Error, origin: NodeJS.UncaughtExceptionOrigin) => void) | undefined
    const rejection = process.listeners('unhandledRejection').find(
      listener => !beforeRejection.includes(listener),
    ) as ((reason: unknown) => void) | undefined

    expect(monitor).toBeTypeOf('function')
    expect(rejection).toBeTypeOf('function')

    monitor?.(new Error('uncaught failure'), 'uncaughtException')
    rejection?.(new Error('rejected failure'))

    expect(mocks.runtimeError).toHaveBeenCalledWith(
      'Uncaught process exception',
      expect.objectContaining({
        operation: 'process_uncaught_exception',
        origin: 'uncaughtException',
        error: 'uncaught failure',
      }),
    )
    expect(mocks.runtimeError).toHaveBeenCalledWith(
      'Unhandled process rejection',
      expect.objectContaining({
        operation: 'process_unhandled_rejection',
        error: 'rejected failure',
      }),
    )
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ operation: 'process_unhandled_rejection' }),
    )

    close?.()
    expect(process.listeners('uncaughtExceptionMonitor')).toEqual(beforeMonitor)
    expect(process.listeners('unhandledRejection')).toEqual(beforeRejection)
  })

  it('rethrows unhandled rejections in production after reporting them', async () => {
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = 'mysql://runtime_user:runtime-password@localhost:3306/runtime_db'
    process.env.JWT_SECRET = 'runtime-production-secret-longer-than-32-characters'
    process.env.NUXT_PUBLIC_SITE_URL = 'https://trade-basic.com'
    process.env.SCHEDULER_ENABLED = 'false'
    vi.stubGlobal('defineNitroPlugin', (plugin: any) => plugin)

    beforeMonitor = process.listeners('uncaughtExceptionMonitor')
    beforeRejection = process.listeners('unhandledRejection')
    const plugin = (await import('~/server/plugins/00-runtime-config')).default
    plugin({
      hooks: {
        hook: (name: string, handler: (...args: any[]) => any) => {
          if (name === 'close') close = handler
          return () => {}
        },
      },
    } as any)

    const rejection = process.listeners('unhandledRejection').find(
      listener => !beforeRejection.includes(listener),
    ) as ((reason: unknown) => void) | undefined

    expect(rejection).toBeTypeOf('function')
    const reason = new Error('fatal production rejection')
    expect(() => rejection?.(reason)).toThrow(reason)
    expect(mocks.reportError).toHaveBeenCalledWith(
      reason,
      expect.objectContaining({ operation: 'process_unhandled_rejection' }),
    )
  })
})
