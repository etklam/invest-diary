import { defineNuxtPlugin } from '#app'
import { useNavigationStore } from '~/stores/navigation'

export default defineNuxtPlugin((nuxtApp) => {
  const navigationStore = useNavigationStore()

  navigationStore.init()

  nuxtApp.hook('page:start', () => {
    navigationStore.setNavigating(true)
  })

  nuxtApp.hook('page:finish', () => {
    navigationStore.setNavigating(false)
  })

  // ✅ 正確方式：在 Nuxt context 內安全使用 useRoute()
  nuxtApp.hook('page:transition:finish', () => {
    nuxtApp.runWithContext(() => {
      const route = useRoute()
      if (route?.path) {
        navigationStore.setCurrentPath(route.path, route.meta?.title as string)
      }
    })
  })

  if (process.client) {
    window.addEventListener('popstate', () => {
      nuxtApp.runWithContext(() => {
        const route = useRoute()
        if (route?.path) {
          navigationStore.setNavigationDirection('backward')
          navigationStore.setCurrentPath(route.path)
        }
      })
    })
  }
})