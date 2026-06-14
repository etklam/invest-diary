import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'

describe('useNavigation composable', () => {
  beforeEach(() => {
    vi.stubGlobal('useRoute', () => ({ path: '/calendar' }))
    vi.stubGlobal('useI18n', () => ({
      t: (key: string) => key,
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('filters navigation items for guests', async () => {
    vi.stubGlobal('useAuth', () => ({
      isAuthenticated: ref(false),
      user: ref(null),
    }))

    const { useNavigation } = await import('~/composables/useNavigation')
    const { mainNavItems } = useNavigation()

    const paths = mainNavItems.value.map(item => item.to)
    expect(paths).toContain('/')
    expect(paths).toContain('/articles')
    expect(paths).toContain('/about')
    expect(paths).not.toContain('/calendar')
    expect(paths).not.toContain('/diaries')
  })

  it('includes auth-only items for authenticated users', async () => {
    vi.stubGlobal('useAuth', () => ({
      isAuthenticated: ref(true),
      user: ref({ role: 'USER' }),
    }))

    const { useNavigation } = await import('~/composables/useNavigation')
    const { mainNavItems } = useNavigation()

    const paths = mainNavItems.value.map(item => item.to)
    expect(paths).toContain('/calendar')
    expect(paths).toContain('/diaries')
    expect(paths).toContain('/reviews')
    expect(paths).toContain('/trade-plans')
    expect(paths).toContain('/strategy-performance')
    expect(paths).toContain('/stocks')
    expect(paths).toContain('/about')
  })

  it('provides tool items for authenticated users', async () => {
    vi.stubGlobal('useAuth', () => ({
      isAuthenticated: ref(true),
      user: ref({ role: 'USER' }),
    }))

    const { useNavigation } = await import('~/composables/useNavigation')
    const { toolNavItems } = useNavigation()

    const paths = toolNavItems.value.map(item => item.to)
    expect(paths).toContain('/discipline')
    expect(paths).toContain('/alerts')
    expect(paths).toContain('/tools/financial-freedom')
    expect(paths).toContain('/tools/seasonality')
  })
})
