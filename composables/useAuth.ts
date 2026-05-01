import { resolveErrorMessage } from '~/composables/useErrorI18n'

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
  response?: {
    status?: number
  }
  data?: {
    statusMessage?: string
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

function isAuthError(error: AuthErrorShape): boolean {
  return error.statusCode === 401 || error.response?.status === 401
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

  const authFetch = <T>(url: string, options?: Record<string, unknown>) => {
    const headers = (options?.headers as Record<string, string> | undefined) ?? {}

    return $fetch<T>(url, {
      ...options,
      headers: process.server && serverCookieHeader
        ? {
            ...headers,
            cookie: headers.cookie ?? serverCookieHeader
          }
        : headers
    })
  }

  const syncTimezone = (timezone?: string) => {
    if (timezone && process.client) {
      localStorage.setItem('user_timezone', timezone)
    }
  }

  const runRefreshPipeline = async (): Promise<boolean> => {
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
      refreshPipeline = null
    }
  }

  const refreshAccessToken = async (): Promise<boolean> => {
    devLog('[Auth] refreshAccessToken called', { hasPipeline: !!refreshPipeline })
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
        toast.success('登入成功')
        await navigateTo('/diaries')
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
        toast.success('註冊成功，請登入')
        await navigateTo('/auth/login')
      }
    } catch (error) {
      const authError = error as AuthErrorShape
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
      devLog('[Auth] fetchMe error', { isAuthError: isAuthError(authError), statusCode: authError.statusCode })

      if (isAuthError(authError)) {
        devLog('[Auth] Attempting token refresh...')
        const refreshed = await refreshAccessToken()
        devLog('[Auth] Token refresh result', { refreshed })
        if (refreshed) {
          try {
            const retryResponse = await authFetch<AuthApiResponse<AuthUser>>('/api/auth/me')
            devLog('[Auth] Retry fetchMe after refresh', { ok: retryResponse.ok })
            if (retryResponse.ok && retryResponse.data) {
              user.value = retryResponse.data
              syncTimezone(retryResponse.data.timezone)
              return
            }
          } catch {
            // fall through to unauthenticated state
          }
        }
      }

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
        toast.success('設定已更新')
        return true
      }
      return false
    } catch (error) {
      const authError = error as AuthErrorShape
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
        toast.success('密碼已更改')
        return true
      }
      return false
    } catch (error) {
      const authError = error as AuthErrorShape
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
