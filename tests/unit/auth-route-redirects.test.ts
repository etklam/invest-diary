import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

describe('authenticated home route middleware', () => {
  const navigateTo = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('defineNuxtRouteMiddleware', (handler: unknown) => handler)
    vi.stubGlobal('navigateTo', navigateTo)
    navigateTo.mockReset()
  })

  afterEach(() => vi.unstubAllGlobals())

  const loadMiddleware = async (authenticated: boolean) => {
    vi.stubGlobal('useAuth', () => ({
      isAuthenticated: ref(authenticated),
      isInitialized: ref(true),
    }))
    return (await import('~/middleware/auth')).default as (to: { path: string, meta: Record<string, unknown> }) => unknown
  }

  it('redirects an authenticated root visit to Timeline', async () => {
    const middleware = await loadMiddleware(true)
    middleware({ path: '/', meta: { requiresAuth: false } })
    expect(navigateTo).toHaveBeenCalledWith('/timeline')
  })

  it('keeps the guest homepage public', async () => {
    const middleware = await loadMiddleware(false)
    middleware({ path: '/', meta: { requiresAuth: false } })
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('sends authenticated auth-page visits to Timeline', async () => {
    const middleware = await loadMiddleware(true)
    middleware({ path: '/auth/login', meta: { requiresAuth: false } })
    expect(navigateTo).toHaveBeenCalledWith('/timeline')
  })
})
