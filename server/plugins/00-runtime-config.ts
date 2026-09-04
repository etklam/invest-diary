import { formatErrorContext, logger } from '~/lib/logger'
import { reportError } from '~/lib/observability'
import { getServerEnv } from '~/server/config/env'

function installProcessErrorObservers(nodeEnv: 'development' | 'test' | 'production') {
  const onUncaughtException = (error: Error, origin: NodeJS.UncaughtExceptionOrigin) => {
    logger.runtime.error('Uncaught process exception', {
      operation: 'process_uncaught_exception',
      origin,
      ...formatErrorContext(error),
    })
    reportError(error, { operation: 'process_uncaught_exception', origin })
  }

  const onUnhandledRejection = (reason: unknown) => {
    logger.runtime.error('Unhandled process rejection', {
      operation: 'process_unhandled_rejection',
      ...formatErrorContext(reason),
    })
    reportError(reason, { operation: 'process_unhandled_rejection' })

    // Keep production fail-fast semantics, while allowing development/test
    // servers to survive expected client disconnects such as ECONNRESET. The
    // event is still always logged/reported, so this branch changes process
    // lifecycle only outside production.
    if (nodeEnv === 'production') throw reason
  }

  process.on('uncaughtExceptionMonitor', onUncaughtException)
  process.on('unhandledRejection', onUnhandledRejection)

  return () => {
    process.removeListener('uncaughtExceptionMonitor', onUncaughtException)
    process.removeListener('unhandledRejection', onUnhandledRejection)
  }
}

/**
 * Validate deployment-critical configuration before Nitro starts serving
 * requests. Keep the warning explicit: this process-local scheduler is not a
 * distributed job system and must be enabled on exactly one active instance.
 */
export default defineNitroPlugin((nitroApp) => {
  const env = getServerEnv()
  const removeProcessErrorObservers = installProcessErrorObservers(env.nodeEnv)

  nitroApp.hooks.hook('close', removeProcessErrorObservers)

  if (env.schedulerEnabled) {
    logger.runtime.warn('Scheduler enabled; deployment must have exactly one active realtime/scheduler instance', {
      operation: 'startup_config',
      schedulerEnabled: true,
      topology: 'single-active-realtime-instance',
    })
  }
})
