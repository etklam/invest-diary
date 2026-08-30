export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    const requestId = event?.context.requestId

    if (!requestId) return

    const errorWithData = error as Error & { data?: Record<string, unknown> }
    errorWithData.data = {
      ...(errorWithData.data && typeof errorWithData.data === 'object' ? errorWithData.data : {}),
      requestId,
    }
  })
})
