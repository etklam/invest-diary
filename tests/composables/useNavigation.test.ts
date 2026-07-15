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

  describe('guest navigation', () => {
    beforeEach(() => {
      vi.stubGlobal('useAuth', () => ({
        isAuthenticated: ref(false),
        user: ref(null),
      }))
    })

    it('filters navigation items for guests', async () => {
      const { useNavigation } = await import('~/composables/useNavigation')
      const { mainNavItems } = useNavigation()

      const paths = mainNavItems.value.map(item => item.to)
      expect(paths).toContain('/')
      expect(paths).toContain('/articles')
      expect(paths).toContain('/about')
      expect(paths).not.toContain('/calendar')
      expect(paths).not.toContain('/diaries')
    })

    it('exposes no desktop groups for guests (guests render flat nav)', async () => {
      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups } = useNavigation()

      expect(desktopNavGroups.value).toEqual([])
    })
  })

  describe('authenticated navigation', () => {
    beforeEach(() => {
      vi.stubGlobal('useAuth', () => ({
        isAuthenticated: ref(true),
        user: ref({ role: 'USER' }),
      }))
    })

    it('includes auth-only items for authenticated users', async () => {
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
      const { useNavigation } = await import('~/composables/useNavigation')
      const { toolNavItems } = useNavigation()

      const paths = toolNavItems.value.map(item => item.to)
      expect(paths).toContain('/discipline')
      expect(paths).toContain('/alerts')
      expect(paths).toContain('/tools/financial-freedom')
      expect(paths).toContain('/tools/seasonality')
    })
  })

  describe('desktopNavGroups (grouped nav generation)', () => {
    beforeEach(() => {
      vi.stubGlobal('useAuth', () => ({
        isAuthenticated: ref(true),
        user: ref({ role: 'USER' }),
      }))
    })

    it('renders exactly the four required groups in fixed order', async () => {
      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups } = useNavigation()

      expect(desktopNavGroups.value.map(g => g.id)).toEqual([
        'journal',
        'portfolio',
        'tools',
        'learn',
      ])
    })

    it('routes Journal children (timeline/calendar/diaries/reviews/trade-plans)', async () => {
      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups } = useNavigation()
      const journal = desktopNavGroups.value.find(g => g.id === 'journal')!

      const paths = journal.items.map(i => i.to)
      expect(paths).toEqual([
        '/timeline',
        '/calendar',
        '/diaries',
        '/reviews',
        '/trade-plans',
      ])
    })

    it('routes Portfolio children (incl. market-rotation/relative-value/strategy-performance)', async () => {
      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups } = useNavigation()
      const portfolio = desktopNavGroups.value.find(g => g.id === 'portfolio')!

      const paths = portfolio.items.map(i => i.to)
      expect(paths).toEqual([
        '/stocks',
        '/stocks/watchlist',
        '/tools/market-rotation',
        '/tools/relative-value',
        '/strategy-performance',
      ])
    })

    it('routes Tools children (no overlap with Portfolio)', async () => {
      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups } = useNavigation()
      const tools = desktopNavGroups.value.find(g => g.id === 'tools')!

      const paths = tools.items.map(i => i.to)
      expect(paths).toEqual([
        '/tools/position-sizing',
        '/tools/financial-freedom',
        '/tools/seasonality',
        '/tools/sec-filings',
        '/discipline',
      ])
      expect(paths).not.toContain('/tools/market-rotation')
      expect(paths).not.toContain('/tools/relative-value')
    })

    it('routes Learn children (articles/how-to-use/about)', async () => {
      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups } = useNavigation()
      const learn = desktopNavGroups.value.find(g => g.id === 'learn')!

      expect(learn.items.map(i => i.to)).toEqual([
        '/articles',
        '/how-to-use',
        '/about',
      ])
    })

    it('pulls every label from i18n (no hardcoded strings)', async () => {
      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups } = useNavigation()

      // The i18n stub returns the key as the value, so labels must equal a nav.* key.
      for (const group of desktopNavGroups.value) {
        expect(group.label).toMatch(/^nav\./)
        for (const item of group.items) {
          expect(item.label).toMatch(/^nav\./)
        }
      }
    })
  })

  describe('isGroupActive (active group detection)', () => {
    beforeEach(() => {
      vi.stubGlobal('useAuth', () => ({
        isAuthenticated: ref(true),
        user: ref({ role: 'USER' }),
      }))
    })

    it('marks only Journal active on /calendar', async () => {
      // route path defaults to '/calendar' from the outer beforeEach
      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups, isGroupActive } = useNavigation()

      const activeIds = desktopNavGroups.value
        .filter(g => isGroupActive(g))
        .map(g => g.id)

      expect(activeIds).toEqual(['journal'])
    })

    it('marks only Portfolio active on /stocks/watchlist', async () => {
      vi.stubGlobal('useRoute', () => ({ path: '/stocks/watchlist' }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups, isGroupActive } = useNavigation()

      const activeIds = desktopNavGroups.value
        .filter(g => isGroupActive(g))
        .map(g => g.id)

      expect(activeIds).toEqual(['portfolio'])
    })

    it('marks Portfolio (not Tools) active on /tools/market-rotation', async () => {
      vi.stubGlobal('useRoute', () => ({ path: '/tools/market-rotation' }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups, isGroupActive } = useNavigation()

      const activeIds = desktopNavGroups.value
        .filter(g => isGroupActive(g))
        .map(g => g.id)

      expect(activeIds).toEqual(['portfolio'])
    })

    it('marks only Tools active on /discipline', async () => {
      vi.stubGlobal('useRoute', () => ({ path: '/discipline' }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups, isGroupActive } = useNavigation()

      const activeIds = desktopNavGroups.value
        .filter(g => isGroupActive(g))
        .map(g => g.id)

      expect(activeIds).toEqual(['tools'])
    })

    it('marks only Learn active on /articles', async () => {
      vi.stubGlobal('useRoute', () => ({ path: '/articles' }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups, isGroupActive } = useNavigation()

      const activeIds = desktopNavGroups.value
        .filter(g => isGroupActive(g))
        .map(g => g.id)

      expect(activeIds).toEqual(['learn'])
    })

    it('marks no group active when route is outside every group (e.g. /alerts)', async () => {
      vi.stubGlobal('useRoute', () => ({ path: '/alerts' }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups, isGroupActive } = useNavigation()

      expect(desktopNavGroups.value.some(g => isGroupActive(g))).toBe(false)
    })

    it('marks Journal active on nested /reviews/123 (prefix match)', async () => {
      vi.stubGlobal('useRoute', () => ({ path: '/reviews/123' }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups, isGroupActive } = useNavigation()

      const activeIds = desktopNavGroups.value
        .filter(g => isGroupActive(g))
        .map(g => g.id)

      expect(activeIds).toEqual(['journal'])
    })
  })

  describe('mobile bottom nav (must stay unchanged by desktop refactor)', () => {
    it('exposes the same five routes for authenticated users', async () => {
      vi.stubGlobal('useAuth', () => ({
        isAuthenticated: ref(true),
        user: ref({ role: 'USER' }),
      }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { bottomNavItems } = useNavigation()

      expect(bottomNavItems.value.map(i => i.to)).toEqual([
        '/',
        '/stocks',
        '/diaries',
        '/alerts',
        '/settings',
      ])
    })

    it('exposes the same five routes for guests (component-level gates visibility)', async () => {
      vi.stubGlobal('useAuth', () => ({
        isAuthenticated: ref(false),
        user: ref(null),
      }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { bottomNavItems } = useNavigation()

      expect(bottomNavItems.value.map(i => i.to)).toEqual([
        '/',
        '/stocks',
        '/diaries',
        '/alerts',
        '/settings',
      ])
    })
  })
})
