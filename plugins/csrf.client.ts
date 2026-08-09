import { ofetch } from 'ofetch'

export default defineNuxtPlugin(() => {
  const csrfToken = useCookie('csrf-token')

  const methods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

  // Preserve Nuxt's $fetch ofetch instance while adding CSRF interceptor
  const _fetch: any = globalThis.$fetch
  const wrappedFetch = ofetch.create({
    onRequest({ options }) {
      const method = (options.method || 'GET').toUpperCase()
      if (methods.has(method) && csrfToken.value) {
        ;(options as any).headers = {
          ...((options as any).headers || {}),
          'x-csrf-token': csrfToken.value,
        }
      }
    },
  }, _fetch as any)

  globalThis.$fetch = wrappedFetch as any
})
