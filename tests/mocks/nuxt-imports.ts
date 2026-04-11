export { watch, computed, ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'

// 導入 ref 用於建立 reactive 回傳值
import { ref } from 'vue'

export const useAuth = () => {
  const globalUseAuth = (globalThis as any).useAuth
  return globalUseAuth ? globalUseAuth() : { isAdmin: false, user: null }
}

export const useI18n = () => {
  const globalUseI18n = (globalThis as any).useI18n
  return globalUseI18n ? globalUseI18n() : { t: (key: string) => key }
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
