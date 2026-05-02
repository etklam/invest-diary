export default defineNuxtPlugin(() => {
  const csrfToken = useCookie('csrf-token')

  const methods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

  // Wrap global $fetch to inject x-csrf-token header on mutating requests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _fetch: any = globalThis.$fetch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.$fetch = ((input: any, init?: any) => {
    const method = (init?.method || 'GET').toUpperCase()
    if (methods.has(method) && csrfToken.value) {
      init = {
        ...init,
        headers: {
          ...(init?.headers || {}),
          'x-csrf-token': csrfToken.value,
        },
      }
    }
    return _fetch(input, init)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
})
