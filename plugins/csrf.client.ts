import { ofetch } from 'ofetch'

export default defineNuxtPlugin(() => {
  const csrfToken = useCookie('csrf-token')

  const methods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

  // Preserve Nuxt's $fetch ofetch instance while adding CSRF interceptor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _fetch: any = globalThis.$fetch
  const wrappedFetch = ofetch.create({
    onRequest({ options }) {
      const method = (options.method || 'GET').toUpperCase()
      if (methods.has(method) && csrfToken.value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(options as any).headers = {
          ...((options as any).headers || {}),
          'x-csrf-token': csrfToken.value,
        }
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, _fetch as any)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.$fetch = wrappedFetch as any
})
