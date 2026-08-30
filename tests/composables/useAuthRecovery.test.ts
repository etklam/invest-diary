import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { ErrorCodes } from '~/lib/contracts/common/error-codes'

describe('useAuthRecovery', () => {
  const user = ref<any>({ id: '1' })
  const refreshAccessToken = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    const push = vi.fn()
    vi.stubGlobal('useAuth', () => ({
      user,
      refreshAccessToken,
    }))
    vi.stubGlobal('useRoute', () => ({
      meta: {
        requiresAuth: true,
      },
    }))
    vi.stubGlobal('useRouter', () => ({ push }))
    vi.stubGlobal('navigateTo', vi.fn())

    user.value = { id: '1' }
    refreshAccessToken.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('retries once after refreshing a recoverable auth session error', async () => {
    refreshAccessToken.mockResolvedValue(true)

    const operation = vi.fn()
      .mockRejectedValueOnce({
        statusCode: 401,
        data: {
          code: ErrorCodes.AUTH_TOKEN_EXPIRED,
        },
      })
      .mockResolvedValueOnce('ok')

    const { useAuthRecovery } = await import('~/composables/useAuthRecovery')
    const { runWithAuthRecovery } = useAuthRecovery()

    await expect(runWithAuthRecovery(operation)).resolves.toBe('ok')
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(operation).toHaveBeenCalledTimes(2)
    expect(globalThis.navigateTo).not.toHaveBeenCalled()
  })

  it('clears auth state and redirects when session recovery fails', async () => {
    refreshAccessToken.mockResolvedValue(false)
    const error = {
      statusCode: 401,
      data: {
        code: ErrorCodes.AUTH_UNAUTHORIZED,
      },
    }

    const operation = vi.fn().mockRejectedValue(error)

    const { useAuthRecovery } = await import('~/composables/useAuthRecovery')
    const { runWithAuthRecovery } = useAuthRecovery()

    await expect(runWithAuthRecovery(operation)).rejects.toBe(error)
    expect(user.value).toBeNull()
    expect(globalThis.useRouter().push).toHaveBeenCalledWith('/auth/login')
  })

  it('does not hijack unrelated 401 responses without the shared auth code', async () => {
    const error = {
      statusCode: 401,
      statusMessage: 'Unauthorized',
    }

    const operation = vi.fn().mockRejectedValue(error)

    const { useAuthRecovery } = await import('~/composables/useAuthRecovery')
    const { runWithAuthRecovery } = useAuthRecovery()

    await expect(runWithAuthRecovery(operation)).rejects.toBe(error)
    expect(refreshAccessToken).not.toHaveBeenCalled()
    expect(user.value).toEqual({ id: '1' })
    expect(globalThis.navigateTo).not.toHaveBeenCalled()
  })

  it('captures route state during setup instead of calling useRoute inside async recovery paths', async () => {
    const route = {
      meta: {
        requiresAuth: true,
      },
    }
    const useRouteMock = vi.fn(() => route)
    refreshAccessToken.mockResolvedValue(false)

    vi.stubGlobal('useRoute', useRouteMock)

    const { useAuthRecovery } = await import('~/composables/useAuthRecovery')
    const { runWithAuthRecovery } = useAuthRecovery()

    const error = {
      statusCode: 401,
      data: {
        code: ErrorCodes.AUTH_UNAUTHORIZED,
      },
    }

    await expect(runWithAuthRecovery(() => Promise.reject(error))).rejects.toBe(error)
    expect(useRouteMock).toHaveBeenCalledTimes(1)
    expect(globalThis.useRouter().push).toHaveBeenCalledWith('/auth/login')
  })
})
