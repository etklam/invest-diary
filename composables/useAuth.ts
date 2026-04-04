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

let refreshPipeline: Promise<boolean> | null = null

function isAuthError(error: AuthErrorShape): boolean {
  return error.statusCode === 401 || error.response?.status === 401
}

async function runRefreshPipeline(): Promise<boolean> {
  try {
    const response = await $fetch<AuthApiResponse<never>>('/api/auth/refresh', {
      method: 'POST',
    })

    return response.ok === true
  } catch {
    return false
  } finally {
    refreshPipeline = null
  }
}

export const useAuth = () => {
  const user = useState<AuthUser | null>('auth:user', () => null)
  const isAuthenticated = computed(() => Boolean(user.value))
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isLoading = useState<boolean>('auth:loading', () => false)
  const isInitialized = useState<boolean>('auth:initialized', () => false)
  const toast = useToast()

  const syncTimezone = (timezone?: string) => {
    if (timezone && process.client) {
      localStorage.setItem('user_timezone', timezone)
    }
  }

  const refreshAccessToken = async (): Promise<boolean> => {
    if (!refreshPipeline) {
      refreshPipeline = runRefreshPipeline()
    }

    return refreshPipeline
  }

  const login = async (email: string, password: string) => {
    isLoading.value = true
    try {
      const response = await $fetch<AuthApiResponse<AuthUser>>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })

      if (response.ok && response.data) {
        user.value = response.data
        syncTimezone(response.data.timezone)
        isInitialized.value = true  // Mark as initialized to prevent redundant fetchMe call
        toast.success('登入成功')
        await navigateTo('/')
      }
    } catch (error) {
      const authError = error as AuthErrorShape
      toast.error(authError.data?.statusMessage || '登入失敗')
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
      toast.error(authError.data?.statusMessage || '註冊失敗')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    await $fetch<AuthApiResponse<never>>('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/auth/login')
  }

  const fetchMe = async () => {
    try {
      isLoading.value = true
      const response = await $fetch<AuthApiResponse<AuthUser>>('/api/auth/me')
      if (response.ok && response.data) {
        user.value = response.data
        syncTimezone(response.data.timezone)
      }
    } catch (error) {
      const authError = error as AuthErrorShape

      if (isAuthError(authError)) {
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          try {
            const retryResponse = await $fetch<AuthApiResponse<AuthUser>>('/api/auth/me')
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
    } catch (error) {
      const authError = error as AuthErrorShape
      toast.error(authError.data?.statusMessage || '更新設定失敗')
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
    } catch (error) {
      const authError = error as AuthErrorShape
      toast.error(authError.data?.statusMessage || '更改密碼失敗')
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
