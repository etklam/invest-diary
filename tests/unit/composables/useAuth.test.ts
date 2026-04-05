import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mockLocalStorage } from '~/tests/helpers/mock'

const createUseState = () => {
  const store = new Map<string, ReturnType<typeof ref>>()
  return (key: string, init: () => any) => {
    if (!store.has(key)) {
      store.set(key, ref(init()))
    }
    return store.get(key)!
  }
}

describe('useAuth composable', () => {
  beforeEach(() => {
    mockLocalStorage()
    vi.resetModules()

    vi.stubGlobal('useState', createUseState())
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('useToast', () => ({
      success: vi.fn(),
      error: vi.fn(),
    }))
    vi.stubGlobal('navigateTo', vi.fn())
    vi.stubGlobal('$fetch', vi.fn())
    vi.stubGlobal('useRequestHeaders', () => ({ cookie: '' }))

    ;(process as any).client = true
    ;(process as any).server = false
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('logs in and updates state', async () => {
    const { useAuth } = await import('~/composables/useAuth')
    const auth = useAuth()

    const mockFetch = (globalThis.$fetch as any)
    mockFetch.mockResolvedValue({
      ok: true,
      data: { id: 1, email: 'test@example.com', role: 'USER', timezone: 'Asia/Taipei' },
    })

    await auth.login('test@example.com', 'password123')

    expect(auth.user.value?.email).toBe('test@example.com')
    expect(auth.isAuthenticated.value).toBe(true)
    expect(globalThis.navigateTo).toHaveBeenCalledWith('/diaries')
    expect(window.localStorage.setItem).toHaveBeenCalledWith('user_timezone', 'Asia/Taipei')
  })

  it('handles login failure with toast error', async () => {
    const { useAuth } = await import('~/composables/useAuth')
    const auth = useAuth()

    const mockFetch = globalThis.$fetch as any
    mockFetch.mockRejectedValue({ data: { statusMessage: '登入失敗' } })

    await expect(auth.login('bad@example.com', 'wrong')).rejects.toBeDefined()
    expect(auth.isLoading.value).toBe(false)
  })

  it('refreshes access token', async () => {
    const { useAuth } = await import('~/composables/useAuth')
    const auth = useAuth()

    const mockFetch = globalThis.$fetch as any
    mockFetch.mockResolvedValueOnce({ ok: true })

    await expect(auth.refreshAccessToken()).resolves.toBe(true)
  })

  it('shares one refresh pipeline across composable instances', async () => {
    const { useAuth } = await import('~/composables/useAuth')
    const authA = useAuth()
    const authB = useAuth()

    const mockFetch = globalThis.$fetch as ReturnType<typeof vi.fn>
    let resolveRefresh: ((value: { ok: true }) => void) | undefined
    mockFetch.mockImplementationOnce(() => new Promise((resolve) => {
      resolveRefresh = resolve
    }))

    const refreshA = authA.refreshAccessToken()
    const refreshB = authB.refreshAccessToken()

    expect(mockFetch).toHaveBeenCalledTimes(1)

    resolveRefresh?.({ ok: true })

    await expect(refreshA).resolves.toBe(true)
    await expect(refreshB).resolves.toBe(true)
  })

  it('forwards SSR cookies when refreshing access token on server', async () => {
    ;(process as any).client = false
    ;(process as any).server = true
    vi.stubGlobal('useRequestHeaders', () => ({
      cookie: 'access-token=abc; refresh-token=def',
    }))

    const { useAuth } = await import('~/composables/useAuth')
    const auth = useAuth()

    const mockFetch = globalThis.$fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValueOnce({ ok: true })

    await expect(auth.refreshAccessToken()).resolves.toBe(true)

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', {
      method: 'POST',
      headers: {
        cookie: 'access-token=abc; refresh-token=def',
      },
    })
  })

  it('logs out and clears user state', async () => {
    const { useAuth } = await import('~/composables/useAuth')
    const auth = useAuth()

    auth.user.value = { id: 1, role: 'USER' }

    const mockFetch = globalThis.$fetch as any
    mockFetch.mockResolvedValueOnce({ ok: true })

    await auth.logout()

    expect(auth.user.value).toBeNull()
    expect(globalThis.navigateTo).toHaveBeenCalledWith('/auth/login')
  })
})
