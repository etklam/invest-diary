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
        'research',
        'more',
      ])
    })

    it('routes Journal children (diaries/calendar/reviews/trade-plans)', async () => {
      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups } = useNavigation()
      const journal = desktopNavGroups.value.find(g => g.id === 'journal')!

      const paths = journal.items.map(i => i.to)
      expect(paths).toEqual([
        '/diaries',
        '/calendar',
        '/reviews',
        '/trade-plans',
      ])
    })

    it('routes Portfolio children without mixing in research tools', async () => {
      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups } = useNavigation()
      const portfolio = desktopNavGroups.value.find(g => g.id === 'portfolio')!

      const paths = portfolio.items.map(i => i.to)
      expect(paths).toEqual([
        '/stocks',
        '/stocks/watchlist',
        '/strategy-performance',
        '/tools/position-sizing',
      ])
    })

    it('routes Research children', async () => {
      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups } = useNavigation()
      const research = desktopNavGroups.value.find(g => g.id === 'research')!

      const paths = research.items.map(i => i.to)
      expect(paths).toEqual([
        '/tools/market-rotation',
        '/tools/relative-value',
        '/tools/seasonality',
        '/tools/sec-filings',
      ])
    })

    it('keeps lower-frequency and account destinations in More', async () => {
      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups } = useNavigation()
      const more = desktopNavGroups.value.find(g => g.id === 'more')!

      expect(more.items.map(i => i.to)).toEqual([
        '/alerts',
        '/partners',
        '/discipline',
        '/tools/financial-freedom',
        '/articles',
        '/how-to-use',
        '/about',
        '/settings',
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

    it('marks Research active on /tools/market-rotation', async () => {
      vi.stubGlobal('useRoute', () => ({ path: '/tools/market-rotation' }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups, isGroupActive } = useNavigation()

      const activeIds = desktopNavGroups.value
        .filter(g => isGroupActive(g))
        .map(g => g.id)

      expect(activeIds).toEqual(['research'])
    })

    it('marks only More active on /discipline', async () => {
      vi.stubGlobal('useRoute', () => ({ path: '/discipline' }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups, isGroupActive } = useNavigation()

      const activeIds = desktopNavGroups.value
        .filter(g => isGroupActive(g))
        .map(g => g.id)

      expect(activeIds).toEqual(['more'])
    })

    it('marks only More active on /articles', async () => {
      vi.stubGlobal('useRoute', () => ({ path: '/articles' }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups, isGroupActive } = useNavigation()

      const activeIds = desktopNavGroups.value
        .filter(g => isGroupActive(g))
        .map(g => g.id)

      expect(activeIds).toEqual(['more'])
    })

    it('marks More active for alerts', async () => {
      vi.stubGlobal('useRoute', () => ({ path: '/alerts' }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { desktopNavGroups, isGroupActive } = useNavigation()

      const activeIds = desktopNavGroups.value
        .filter(g => isGroupActive(g))
        .map(g => g.id)

      expect(activeIds).toEqual(['more'])
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

  describe('homeRoute (authenticated workbench home)', () => {
    it('points authenticated Logo/Home to /timeline', async () => {
      vi.stubGlobal('useAuth', () => ({
        isAuthenticated: ref(true),
        user: ref({ role: 'USER' }),
      }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { homeRoute } = useNavigation()

      expect(homeRoute.value).toBe('/timeline')
    })

    it('points unauthenticated Logo/Home to /', async () => {
      vi.stubGlobal('useAuth', () => ({
        isAuthenticated: ref(false),
        user: ref(null),
      }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { homeRoute } = useNavigation()

      expect(homeRoute.value).toBe('/')
    })
  })

  describe('mobile bottom nav', () => {
    beforeEach(() => {
      vi.stubGlobal('useAuth', () => ({
        isAuthenticated: ref(true),
        user: ref({ role: 'USER' }),
      }))
    })

    it('exposes five job-based slots without duplicate destinations', async () => {
      vi.stubGlobal('useAuth', () => ({
        isAuthenticated: ref(true),
        user: ref({ role: 'USER' }),
      }))

      const { useNavigation } = await import('~/composables/useNavigation')
      const { bottomNavItems } = useNavigation()

      expect(bottomNavItems.value.map(i => i.id)).toEqual([
        'timeline',
        'portfolio',
        'quick-diary',
        'review',
        'more',
      ])
      expect(bottomNavItems.value.map(i => i.to)).toEqual([
        '/timeline',
        '/stocks',
        undefined,
        '/reviews',
        undefined,
      ])
      expect(bottomNavItems.value[2]?.action).toBe('quick-diary')
      expect(bottomNavItems.value[4]?.action).toBe('more')
      const destinations = bottomNavItems.value.flatMap(item => item.to ? [item.to] : [])
      expect(new Set(destinations).size).toBe(destinations.length)
    })

    it('keeps Pair View under the single Timeline active item', async () => {
      vi.stubGlobal('useRoute', () => ({ path: '/timeline/compare' }))
      const { useNavigation } = await import('~/composables/useNavigation')
      const { bottomNavItems, isBottomNavActive } = useNavigation()

      expect(bottomNavItems.value.filter(isBottomNavActive).map(item => item.id)).toEqual(['timeline'])
    })

    it('uses More as the active primary item for nested lower-frequency routes', async () => {
      vi.stubGlobal('useRoute', () => ({ path: '/trade-plans/123' }))
      const { useNavigation } = await import('~/composables/useNavigation')
      const { bottomNavItems, isBottomNavActive } = useNavigation()

      expect(bottomNavItems.value.filter(isBottomNavActive).map(item => item.id)).toEqual(['more'])
    })
  })
})
