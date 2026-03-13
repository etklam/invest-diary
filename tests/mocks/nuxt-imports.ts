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
