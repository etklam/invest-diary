import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('auth page hydration regressions', () => {
  it('login page should render a hydration gate so the first click is visibly blocked until handlers are ready', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/auth/login.vue'), 'utf-8')

    expect(source).toContain("const isHydrated = ref(false)")
    expect(source).toContain('onMounted(() => {')
    expect(source).toContain('isHydrated.value = true')
    expect(source).toContain('<fieldset :disabled="!isHydrated || isLoading" :aria-busy="!isHydrated || isLoading"')
    expect(source).toContain(':disabled="!isHydrated || isLoading"')
    expect(source).toContain("{{ !isHydrated ? $t('common.loading') : isLoading ? $t('auth.loggingIn') : $t('auth.login') }}")
  })

  it('register page should use the same hydration gate pattern to avoid dead clicks before Vue mounts', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/auth/register.vue'), 'utf-8')

    expect(source).toContain("const isHydrated = ref(false)")
    expect(source).toContain('onMounted(() => {')
    expect(source).toContain('isHydrated.value = true')
    expect(source).toContain('<fieldset :disabled="!isHydrated || isLoading" :aria-busy="!isHydrated || isLoading"')
    expect(source).toContain(':disabled="!isHydrated || isLoading || !isFormValid"')
    expect(source).toContain("{{ !isHydrated ? $t('common.loading') : isLoading ? $t('auth.registering') : $t('auth.register') }}")
  })
})
