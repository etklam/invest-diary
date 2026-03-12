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
    const { visibleNavItems } = useNavigation()

    const paths = visibleNavItems.value.map(item => item.to)
    expect(paths).toContain('/')
    expect(paths).toContain('/articles')
    expect(paths).toContain('/about')
    expect(paths).not.toContain('/admin')
  })

  it('includes admin-only items for admin users', async () => {
    vi.stubGlobal('useAuth', () => ({
      isAuthenticated: ref(true),
      user: ref({ role: 'ADMIN' }),
    }))

    const { useNavigation } = await import('~/composables/useNavigation')
    const { visibleNavItems } = useNavigation()

    const paths = visibleNavItems.value.map(item => item.to)
    expect(paths).toContain('/admin')
    expect(paths).toContain('/admin/blog')
  })

  it('hides admin-only items for non-admin users', async () => {
    vi.stubGlobal('useAuth', () => ({
      isAuthenticated: ref(true),
      user: ref({ role: 'USER' }),
    }))

    const { useNavigation } = await import('~/composables/useNavigation')
    const { visibleNavItems } = useNavigation()

    const paths = visibleNavItems.value.map(item => item.to)
    expect(paths).not.toContain('/admin')
    expect(paths).not.toContain('/admin/blog')
    expect(paths).toContain('/calendar')
  })
})
