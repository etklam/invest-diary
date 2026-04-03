import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('auth client regressions', () => {
  it('websocket plugin should not read httpOnly access-token cookie from client JS', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/websocket.client.ts'), 'utf-8')
    expect(source).not.toContain("useCookie('access-token')")
    expect(source).toContain('withCredentials: true')
  })

  it('fetchMe should attempt token refresh on 401 before clearing user', () => {
    const source = readFileSync(resolve(process.cwd(), 'composables/useAuth.ts'), 'utf-8')
    expect(source).toContain('const refreshed = await refreshAccessToken()')
    expect(source).toContain("'/api/auth/me'")
  })

  it('alerts polling should try refresh on 401 before forcing logout', () => {
    const source = readFileSync(resolve(process.cwd(), 'layouts/default.vue'), 'utf-8')
    expect(source).toContain('runWithAuthRecovery')
    expect(source).toContain("$fetch<any[]>('/api/alerts')")
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
