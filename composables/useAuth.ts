import { resolveErrorMessage } from '~/composables/useErrorI18n'
import { AUTHENTICATED_HOME_ROUTE } from '~/lib/routes'

interface AuthUser {
  id: string
  email: string
  role: string
  name?: string | null
  expectedMonthlyTrades?: number
  expectedProfit?: number
  expectedAvgHolding?: number
  timezone?: string
}

interface AuthApiResponse<T> {
  ok?: boolean
  success?: boolean
  data?: T
  settings?: Partial<AuthUser>
}

interface AuthErrorShape {
  statusCode?: number
}

type ResponseCookieHeaderValue = string | string[] | undefined

interface ResponseHeadersLike {
  getSetCookie?: () => string[]
  get?: (name: string) => string | null
}

interface FetchResponseContextLike {
  response?: {
    headers?: ResponseHeadersLike
  }
}

interface RegisterPayload {
  email: string
  password: string
  name?: string
}

interface UserSettingsPayload {
  name?: string
  expectedMonthlyTrades?: number
  expectedProfit?: number
  expectedAvgHolding?: number
  timezone?: string
}

// Dev-only logging to prevent leaking auth details in production
const devLog = (...args: unknown[]) => {
  if (import.meta.dev) console.log(...args)
}

let refreshPipeline: Promise<boolean> | null = null

/**
 * `Headers.get('set-cookie')` may combine multiple cookies into one value.
 * Cookie Expires dates also contain commas, so split only at the beginning of
 * the next cookie pair. Node's `getSetCookie()` is preferred when available.
 */
function splitSetCookieHeader(value: string): string[] {
  return value
    .split(/,(?=\s*[^;,=\s]+=[^;,]*)/)
    .map(cookie => cookie.trim())
    .filter(Boolean)
}

function readResponseCookies(context: unknown): string[] {
  const headers = (context as FetchResponseContextLike | null)?.response?.headers
  if (!headers) return []

  const separateCookies = headers.getSetCookie?.()
  if (separateCookies?.length) return separateCookies

  const combinedCookies = headers.get?.('set-cookie')
  return combinedCookies ? splitSetCookieHeader(combinedCookies) : []
}

function responseCookieKey(cookie: string): string {
  const name = /^([^=;\s]+)=/.exec(cookie)?.[1]
  if (!name) return cookie

  const path = /;\s*path=([^;]+)/i.exec(cookie)?.[1]?.trim().toLowerCase() ?? '/'
  return `${name.toLowerCase()};${path}`
}

function mergeResponseCookies(
  existing: ResponseCookieHeaderValue,
  incoming: string[],
): string[] {
  const merged = typeof existing === 'string'
    ? splitSetCookieHeader(existing)
    : [...(existing ?? [])]

  for (const cookie of incoming) {
    const key = responseCookieKey(cookie)
    const existingIndex = merged.findIndex(value => responseCookieKey(value) === key)
    if (existingIndex === -1) merged.push(cookie)
    else merged[existingIndex] = cookie
  }

  return merged
}

export const useAuth = () => {
  const user = useState<AuthUser | null>('auth:user', () => null)
  const isAuthenticated = computed(() => Boolean(user.value))
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isLoading = useState<boolean>('auth:loading', () => false)
  const isInitialized = useState<boolean>('auth:initialized', () => false)
  const toast = useToast()
  const { t } = (() => {
    try {
      return useI18n()
    } catch {
      return { t: (key: string) => key }
    }
  })()
  const serverCookieHeader = process.server
    ? (useRequestHeaders(['cookie']).cookie ?? '')
    : ''
  // A nested SSR `$fetch` creates its own H3 event. Cookies set by the nested
  // auth middleware must be copied to the outer HTML response or the browser
  // will not retain the renewed access session after hydration.
  const serverResponseCookies = process.server && typeof useResponseHeader === 'function'
    ? useResponseHeader('set-cookie')
    : null

  const authFetch = <T>(url: string, options?: Record<string, unknown>) => {
    const headers = (options?.headers as Record<string, string> | undefined) ?? {}
    const requestOptions: Record<string, unknown> = {
      ...options,
      headers: process.server && serverCookieHeader
        ? {
            ...headers,
            cookie: headers.cookie ?? serverCookieHeader
          }
        : headers
    }

    if (serverResponseCookies) {
      const originalOnResponse = options?.onResponse as
        | ((context: unknown) => unknown)
        | undefined

      requestOptions.onResponse = (context: unknown) => {
        const responseCookies = readResponseCookies(context)
        if (responseCookies.length) {
          serverResponseCookies.value = mergeResponseCookies(
            serverResponseCookies.value as ResponseCookieHeaderValue,
            responseCookies,
          )
        }

        return originalOnResponse?.(context)
      }
    }

    return $fetch<T>(url, requestOptions)
  }

  const syncTimezone = (timezone?: string) => {
    if (timezone && process.client) {
      localStorage.setItem('user_timezone', timezone)
    }
  }

  const runRefreshPipeline = async (clearSharedPipeline = true): Promise<boolean> => {
    devLog('[Auth] runRefreshPipeline started')
    try {
      const response = await authFetch<AuthApiResponse<never>>('/api/auth/refresh', {
        method: 'POST',
      })

      devLog('[Auth] runRefreshPipeline result', { ok: response.ok })
      return response.ok === true
    } catch (error) {
      devLog('[Auth] runRefreshPipeline failed', { error })
      return false
    } finally {
      devLog('[Auth] runRefreshPipeline clearing pipeline')
      if (clearSharedPipeline) refreshPipeline = null
    }
  }

  const refreshAccessToken = async (): Promise<boolean> => {
    devLog('[Auth] refreshAccessToken called', { hasPipeline: !!refreshPipeline })
    if (process.server) {
      return runRefreshPipeline(false)
    }

    if (!refreshPipeline) {
      devLog('[Auth] Creating new refresh pipeline')
      refreshPipeline = runRefreshPipeline()
    } else {
      devLog('[Auth] Reusing existing refresh pipeline')
    }

    return refreshPipeline
  }

  const login = async (email: string, password: string) => {
    isLoading.value = true
    devLog('[Auth] Login started')
    try {
      const response = await $fetch<AuthApiResponse<AuthUser>>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })

      if (response.ok && response.data) {
        devLog('[Auth] Login successful, setting user state')
        user.value = response.data
        syncTimezone(response.data.timezone)
        isInitialized.value = true
        toast.success(t('auth.toasts.loginSuccess'))
        await navigateTo(AUTHENTICATED_HOME_ROUTE)
      }
    } catch (error) {
      const authError = error as AuthErrorShape
      devLog('[Auth] Login failed raw', error)
      devLog('[Auth] Login failed', { statusCode: authError.statusCode })
      toast.error(resolveErrorMessage(error, t))
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const register = async (data: RegisterPayload) => {
    try {
      isLoading.value = true
      const response = await $fetch<AuthApiResponse<never>>('/api/auth/register', {
        method: 'POST',
        body: data,
      })

      if (response.success) {
        toast.success(t('auth.toasts.registerSuccess'))
        await navigateTo('/auth/login')
      }
    } catch (error) {
      toast.error(resolveErrorMessage(error, t))
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    devLog('[Auth] logout called')
    try {
      await $fetch<AuthApiResponse<never>>('/api/auth/logout', { method: 'POST' })
    } catch {
      // Silently ignore logout API errors
    }
    user.value = null
    await navigateTo('/auth/login')
  }

  const fetchMe = async () => {
    devLog('[Auth] fetchMe called', {
      isInitialized: isInitialized.value,
      hasUser: !!user.value,
    })
    try {
      isLoading.value = true
      const response = await authFetch<AuthApiResponse<AuthUser>>('/api/auth/me')
      devLog('[Auth] fetchMe response', { ok: response.ok, hasData: !!response.data })
      if (response.ok && response.data) {
        user.value = response.data
        syncTimezone(response.data.timezone)
      }
    } catch (error) {
      const authError = error as AuthErrorShape
      devLog('[Auth] fetchMe error', { statusCode: authError.statusCode })
      user.value = null
    } finally {
      isLoading.value = false
      isInitialized.value = true
    }
  }

  const updateSettings = async (settings: UserSettingsPayload) => {
    try {
      isLoading.value = true
      const response = await $fetch<AuthApiResponse<never>>('/api/user/settings', {
        method: 'PUT',
        body: settings,
      })

      if (response.success) {
        user.value = {
          ...user.value,
          ...response.settings,
        } as AuthUser
        syncTimezone(settings.timezone)
        toast.success(t('auth.toasts.settingsUpdated'))
        return true
      }
      return false
    } catch (error) {
      toast.error(resolveErrorMessage(error, t))
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      isLoading.value = true
      const response = await $fetch<AuthApiResponse<never>>('/api/user/password', {
        method: 'PUT',
        body: { currentPassword, newPassword },
      })

      if (response.success) {
        toast.success(t('auth.toasts.passwordChanged'))
        return true
      }
      return false
    } catch (error) {
      toast.error(resolveErrorMessage(error, t))
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    isInitialized,
    login,
    register,
    logout,
    fetchMe,
    updateSettings,
    changePassword,
    refreshAccessToken,
  }
}
