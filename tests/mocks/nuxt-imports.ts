export { watch, computed, ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'

// 導入 ref 用於建立 reactive 回傳值
import { ref } from 'vue'

export const useAuth = () => {
  const globalUseAuth = (globalThis as any).useAuth
  return globalUseAuth ? globalUseAuth() : { isAdmin: ref(false), user: ref(null) }
}

export const useI18n = () => {
  const globalUseI18n = (globalThis as any).useI18n
  return globalUseI18n
    ? globalUseI18n()
    : { t: (key: string) => key, locale: ref('zh-TW') }
}

export const useToast = () => {
  const globalUseToast = (globalThis as any).useToast
  return globalUseToast
    ? globalUseToast()
    : {
        success: () => {},
        error: () => {},
        info: () => {},
        warning: () => {},
      }
}

export const refreshNuxtData = (...args: any[]) => {
  const globalRefreshNuxtData = (globalThis as any).refreshNuxtData
  return globalRefreshNuxtData ? globalRefreshNuxtData(...args) : undefined
}

export const $fetch = (...args: any[]) => {
  const globalFetch = (globalThis as any).$fetch
  return globalFetch ? globalFetch(...args) : Promise.resolve(null)
}

export const useFetch = (...args: any[]) => {
  const globalUseFetch = (globalThis as any).useFetch
  if (globalUseFetch) return globalUseFetch(...args)
  return {
    data: ref(null),
    pending: ref(false),
    error: ref(null),
    execute: () => Promise.resolve(),
    refresh: () => Promise.resolve(),
  }
}

export const useLazyFetch = (...args: any[]) => {
  const globalUseLazyFetch = (globalThis as any).useLazyFetch
  if (globalUseLazyFetch) return globalUseLazyFetch(...args)
  return {
    data: ref(null),
    pending: ref(false),
    error: ref(null),
    execute: () => Promise.resolve(),
    refresh: () => Promise.resolve(),
  }
}

// Additional Nuxt auto-imports used by page components under test.
// These delegate to globals when tests register them, otherwise return no-ops.
export const useRoute = () =>
  (globalThis as any).useRoute
    ? (globalThis as any).useRoute()
    : { params: {} }

export const useRouter = () =>
  (globalThis as any).useRouter
    ? (globalThis as any).useRouter()
    : { push: () => Promise.resolve() }

export const useRuntimeConfig = () =>
  (globalThis as any).useRuntimeConfig
    ? (globalThis as any).useRuntimeConfig()
    : { public: { siteUrl: 'https://example.test' } }

export const useHead = () => {}

export const definePageMeta = () => {}

export const usePerformance = () => ({
  startMonitoring: () => {},
  stopMonitoring: () => {},
})

export const useStructuredData = () => ({
  injectBlogPostingSchema: () => {},
  injectBreadcrumbSchema: () => {},
})

/**
 * useAsyncData fallback: resolves the handler and stores result in data ref.
 * Tests can register globalThis.useAsyncData to override behavior.
 */
export const useAsyncData = async (key: any, handler?: any, options?: any) => {
  const globalUseAsyncData = (globalThis as any).useAsyncData
  if (globalUseAsyncData) return globalUseAsyncData(key, handler, options)
  try {
    const result = handler ? await handler() : null
    return {
      data: ref(result),
      pending: ref(false),
      error: ref(null),
      refresh: () => Promise.resolve(),
    }
  } catch (err) {
    return {
      data: ref(null),
      pending: ref(false),
      error: ref(err),
      refresh: () => Promise.resolve(),
    }
  }
}
