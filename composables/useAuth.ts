export const useAuth = () => {
  const user = useState<any>('auth:user', () => null)
  const isAuthenticated = computed(() => Boolean(user.value))
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isLoading = useState<boolean>('auth:loading', () => false)
  const isInitialized = useState<boolean>('auth:initialized', () => false)
  const toast = useToast()

  // Track if a refresh is in progress to prevent multiple simultaneous refresh attempts
  const isRefreshing = ref(false)
  // Queue of pending refresh waiters; boolean indicates refresh success
  const refreshQueue: Array<(ok: boolean) => void> = []

  /**
   * Refresh access token using refresh token cookie
   */
  const refreshAccessToken = async (): Promise<boolean> => {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshing.value) {
      // If already refreshing, wait for it to complete
      return new Promise((resolve) => {
        refreshQueue.push(resolve)
      })
    }

    isRefreshing.value = true

    try {
      const response = await $fetch('/api/auth/refresh', {
        method: 'POST'
      }) as any

      if (response.ok) {
        // Refresh successful - resolve queued requests
        isRefreshing.value = false
        refreshQueue.forEach(fn => fn(true))
        refreshQueue.length = 0
        return true
      }

      // Refresh endpoint responded but not OK
      isRefreshing.value = false
      refreshQueue.forEach(fn => fn(false))
      refreshQueue.length = 0
      return false
    } catch (error) {
      // Refresh failed - user needs to re-login
      isRefreshing.value = false
      refreshQueue.forEach(fn => fn(false))
      refreshQueue.length = 0
      return false
    }
  }

  /**
   * Login with email and password
   * Server sets httpOnly cookie, client only syncs user state
   */
  const login = async (email: string, password: string) => {
    isLoading.value = true
    try {
      const response = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      }) as any

      if (response.ok) {
        user.value = response.data
        toast.success('登入成功')
        await navigateTo('/')
      }
    } catch (error: any) {
      toast.error(error.data?.statusMessage || '登入失敗')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Register a new user
   */
  const register = async (data: { email: string; password: string; name?: string }) => {
    try {
      isLoading.value = true
      const response = await $fetch('/api/auth/register', {
        method: 'POST',
        body: data
      }) as any

      if (response.ok) {
        toast.success('註冊成功，請登入')
        await navigateTo('/auth/login')
      }
    } catch (error: any) {
      const errorMessage = error.data?.statusMessage || '註冊失敗'
      toast.error(errorMessage)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Logout current user
   */
  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/auth/login')
  }

  /**
   * Fetch current user info
   */
  const fetchMe = async () => {
    try {
      isLoading.value = true
      const response = await $fetch('/api/auth/me') as any
      if (response.ok) {
        user.value = response.data
      }
    } catch {
      user.value = null
    } finally {
      isLoading.value = false
      isInitialized.value = true
    }
  }

  /**
   * Update user settings
   */
  const updateSettings = async (settings: {
    name?: string
    expectedMonthlyTrades?: number
    expectedProfit?: number
    expectedAvgHolding?: number
  }) => {
    try {
      isLoading.value = true
      const response = await $fetch('/api/user/settings', {
        method: 'PUT',
        body: settings
      }) as any

      if (response.success) {
        // Update local user state
        user.value = {
          ...user.value,
          ...response.settings
        }
        toast.success('設定已更新')
        return true
      }
    } catch (error: any) {
      const errorMessage = error.data?.statusMessage || '更新設定失敗'
      toast.error(errorMessage)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Change password
   */
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      isLoading.value = true
      const response = await $fetch('/api/user/password', {
        method: 'PUT',
        body: { currentPassword, newPassword }
      }) as any

      if (response.success) {
        toast.success('密碼已更改')
        return true
      }
    } catch (error: any) {
      const errorMessage = error.data?.statusMessage || '更改密碼失敗'
      toast.error(errorMessage)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch with authentication and 401 error handling
   */
  // ❌ 移除 fetchWithAuth：401 UX 由 global error handler 處理

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
    refreshAccessToken
  }
}
