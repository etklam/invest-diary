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
  console.log('[Auth] runRefreshPipeline started')
  try {
    const response = await $fetch<AuthApiResponse<never>>('/api/auth/refresh', {
      method: 'POST',
    })

    console.log('[Auth] runRefreshPipeline result', { ok: response.ok })
    return response.ok === true
  } catch (error) {
    console.log('[Auth] runRefreshPipeline failed', { error })
    return false
  } finally {
    console.log('[Auth] runRefreshPipeline clearing pipeline')
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
    console.log('[Auth] refreshAccessToken called', { hasPipeline: !!refreshPipeline })
    if (!refreshPipeline) {
      console.log('[Auth] Creating new refresh pipeline')
      refreshPipeline = runRefreshPipeline()
    } else {
      console.log('[Auth] Reusing existing refresh pipeline')
    }

    return refreshPipeline
  }

  const login = async (email: string, password: string) => {
    isLoading.value = true
    console.log('[Auth] Login started', { email })
    try {
      const response = await $fetch<AuthApiResponse<AuthUser>>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })

      if (response.ok && response.data) {
        console.log('[Auth] Login successful, setting user state', {
          userId: response.data.id,
          isInitializedBefore: isInitialized.value
        })
        user.value = response.data
        syncTimezone(response.data.timezone)
        isInitialized.value = true  // Mark as initialized to prevent redundant fetchMe call
        console.log('[Auth] User state set, navigating to home')
        toast.success('登入成功')
        await navigateTo('/')
      }
    } catch (error) {
      const authError = error as AuthErrorShape
      console.error('[Auth] Login failed', { email, error: authError })
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
    console.log('[Auth] logout called', { hasUser: !!user.value, userId: user.value?.id })
    try {
      await $fetch<AuthApiResponse<never>>('/api/auth/logout', { method: 'POST' })
      console.log('[Auth] logout API call successful')
    } catch (error) {
      console.log('[Auth] logout API call failed', { error })
    }
    user.value = null
    console.log('[Auth] user cleared, navigating to login')
    await navigateTo('/auth/login')
  }

  const fetchMe = async () => {
    console.log('[Auth] fetchMe called', {
      isInitialized: isInitialized.value,
      hasUser: !!user.value,
      userId: user.value?.id
    })
    try {
      isLoading.value = true
      const response = await $fetch<AuthApiResponse<AuthUser>>('/api/auth/me')
      console.log('[Auth] fetchMe response', { ok: response.ok, hasData: !!response.data })
      if (response.ok && response.data) {
        user.value = response.data
        syncTimezone(response.data.timezone)
        console.log('[Auth] fetchMe success, user set')
      }
    } catch (error) {
      const authError = error as AuthErrorShape
      console.log('[Auth] fetchMe error', { isAuthError: isAuthError(authError), statusCode: authError.statusCode })

      if (isAuthError(authError)) {
        console.log('[Auth] Attempting token refresh...')
        const refreshed = await refreshAccessToken()
        console.log('[Auth] Token refresh result', { refreshed })
        if (refreshed) {
          try {
            const retryResponse = await $fetch<AuthApiResponse<AuthUser>>('/api/auth/me')
            console.log('[Auth] Retry fetchMe after refresh', { ok: retryResponse.ok })
            if (retryResponse.ok && retryResponse.data) {
              user.value = retryResponse.data
              syncTimezone(retryResponse.data.timezone)
              console.log('[Auth] Retry success, user set')
              return
            }
          } catch {
            console.log('[Auth] Retry failed, clearing user')
            // fall through to unauthenticated state
          }
        }
      }

      console.log('[Auth] Setting user to null')
      user.value = null
    } finally {
      isLoading.value = false
      isInitialized.value = true
      console.log('[Auth] fetchMe completed, isInitialized set to true')
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
