import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ponytail: source-scrape only, kept deliberately. The behaviors guarded
// here (httpOnly access-token must NOT be read via useCookie in the
// websocket plugin, public-route skip, and terminal auth-session handling)
// are security/correctness invariants. Behavioral tests in tests/api/auth.test.ts
// and tests/integration/auth-flow.test.ts cover the runtime side; these
// source checks catch the specific anti-patterns that behavioral tests
// would not flag (e.g. cookies leaking to client JS, duplicate inline
// 401 cleanup instead of shared recovery).
describe('auth client regressions', () => {
  it('websocket plugin should not read httpOnly access-token cookie from client JS', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/websocket.client.ts'), 'utf-8')
    expect(source).not.toContain("useCookie('access-token')")
    expect(source).toContain('withCredentials: true')
  })

  it('websocket plugin should wait for protected routes before connecting', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/websocket.client.ts'), 'utf-8')
    expect(source).toContain("const publicRoutes = new Set(['/auth/login', '/auth/register'])")
    expect(source).toContain("route.meta?.requiresAuth")
    expect(source).toContain("nuxtApp.hook('page:finish', syncConnection)")
  })

  it('auth bootstrap should skip fetchMe on public routes without auth cookies', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/auth.ts'), 'utf-8')
    expect(source).toContain("const publicRoutes = new Set(['/auth/login', '/auth/register'])")
    expect(source).toContain("useRequestHeaders(['cookie']).cookie ?? ''")
    expect(source).toContain('isInitialized.value = true')
  })

  it('fetchMe should delegate access→refresh recovery to the server resolver', () => {
    const source = readFileSync(resolve(process.cwd(), 'composables/useAuth.ts'), 'utf-8')
    expect(source).toContain("useRequestHeaders(['cookie']).cookie ?? ''")
    expect(source).toContain('cookie: headers.cookie ?? serverCookieHeader')
    expect(source).toContain("useResponseHeader('set-cookie')")
    expect(source).toContain('requestOptions.onResponse')
    expect(source).not.toContain('const refreshed = await refreshAccessToken()')
    expect(source).not.toContain('Attempting token refresh')
    expect(source).not.toMatch(/localStorage\.(?:getItem|setItem)\([^)]*(?:access-token|refresh-token)/)
    expect(source).toContain("'/api/auth/me'")
  })

  it('default layout should delegate alert polling to useAlerts instead of owning a duplicate auth recovery loop', () => {
    const source = readFileSync(resolve(process.cwd(), 'layouts/default.vue'), 'utf-8')
    expect(source).toContain("import { useAlerts } from '~/composables/useAlerts'")
    expect(source).not.toContain('runWithAuthRecovery')
    expect(source).not.toContain("$fetch<any[]>('/api/alerts')")
    expect(source).not.toContain('checkForDueAlerts')
  })

  it('useAlerts should own alert HTTP recovery so layout polling does not race websocket reconnects', () => {
    const source = readFileSync(resolve(process.cwd(), 'composables/useAlerts.ts'), 'utf-8')
    expect(source).toContain('const { runWithAuthRecovery } = useAuthRecovery()')
    expect(source).toContain("runWithAuthRecovery(() => $fetch<AlertApiResponse[]>('/api/alerts'))")
    expect(source).toContain("runWithAuthRecovery(() => $fetch(`/api/alerts/${alert.id}/dismiss`, { method: 'PUT' }))")
  })

  it('global 401 handler should only auto-logout on auth session errors', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/error-handler.ts'), 'utf-8')
    expect(source).toContain('isAuthSessionError')
    expect(source).not.toContain('Token expired')
    expect(source).not.toContain('extractStatusMessage')
    expect(source).not.toContain('authSessionErrorCodes')
  })

  it('protected diary and alert pages should use shared auth recovery instead of inline 401 cleanup', () => {
    const files = [
      'pages/alerts/index.vue',
      'pages/diaries/new.vue',
      'pages/diaries/[id]/edit.vue',
      'pages/diaries/[id]/index.vue',
    ]

    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf-8')
      expect(source).toContain('runWithAuthRecovery')
      expect(source).not.toContain('statusCode === 401')
      expect(source).not.toContain('user.value = null')
      expect(source).not.toContain("navigateTo('/')")
    }
  })

  it('calendar page should use useCalendar composable which handles auth recovery internally', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/calendar.vue'), 'utf-8')
    expect(source).toContain('useCalendar')
    expect(source).not.toContain('statusCode === 401')
    expect(source).not.toContain('user.value = null')
    expect(source).not.toContain("navigateTo('/')")
  })
})
