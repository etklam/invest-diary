import { logger, formatErrorContext } from '~/lib/logger'
import { reportError } from '~/lib/observability'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    const requestId = event?.context.requestId

    const statusCode = (error as { statusCode?: unknown })?.statusCode
    if (typeof statusCode !== 'number' || statusCode >= 500) {
      const requestLog = logger.api.withRequestId(requestId)
      const userId = (event?.context.user as { id?: string | bigint } | undefined)?.id
      const context = {
        operation: 'http_request',
        ...(requestId ? { requestId } : {}),
        method: event?.method,
        path: event?.path,
        ...(userId === undefined ? {} : { userId: userId.toString() }),
      }
      requestLog.error('Unhandled request error', {
        ...context,
        ...formatErrorContext(error),
      })
      reportError(error, context)
    }

    if (!requestId) return

    const errorWithData = error as Error & { data?: Record<string, unknown> }
    errorWithData.data = {
      ...(errorWithData.data && typeof errorWithData.data === 'object' ? errorWithData.data : {}),
      requestId,
    }
  })
})
