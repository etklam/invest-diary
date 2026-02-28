import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('auth client regressions', () => {
  it('websocket plugin should read access-token cookie name', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/websocket.client.ts'), 'utf-8')
    expect(source).toContain("useCookie('access-token')")
    expect(source).not.toContain("useCookie('access_token')")
  })

  it('fetchMe should attempt token refresh on 401 before clearing user', () => {
    const source = readFileSync(resolve(process.cwd(), 'composables/useAuth.ts'), 'utf-8')
    expect(source).toContain('const refreshed = await refreshAccessToken()')
    expect(source).toContain("const response = await $fetch('/api/auth/me')")
  })

  it('alerts polling should try refresh on 401 before forcing logout', () => {
    const source = readFileSync(resolve(process.cwd(), 'layouts/default.vue'), 'utf-8')
    expect(source).toContain('const refreshed = await refreshAccessToken()')
    expect(source).toContain('if (!hasRetriedAuth && error?.statusCode === 401)')
  })

  it('global 401 handler should only auto-logout on auth session errors', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/error-handler.ts'), 'utf-8')
    expect(source).toContain('const shouldHandle401')
    expect(source).toContain('AUTH_TOKEN_EXPIRED')
    expect(source).toContain('return')
  })
})
