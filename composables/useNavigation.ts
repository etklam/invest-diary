import { computed } from 'vue'

// Featured tools: first N tools shown prominently on desktop nav
const FEATURED_TOOLS_COUNT = 3

// Bottom navigation routes (mobile)
const BOTTOM_NAV_ROUTES = ['/', '/stocks', '/diaries', '/alerts', '/settings'] as const

interface NavItem {
  label: string
  to: string
  icon: string
  auth?: boolean // true = only auth, false = only guest, undefined = both
  admin?: boolean // true = only admin
}

export const useNavigation = () => {
  const { isAuthenticated, user } = useAuth()
  const route = useRoute()
  const { t } = useI18n()

  const mainNavItems = computed<NavItem[]>(() => {
    if (!isAuthenticated.value) {
      return [
        { label: t('nav.home'), to: '/', icon: 'home', auth: false },
        { label: t('nav.howToUse'), to: '/how-to-use', icon: 'map' },
        { label: t('nav.about'), to: '/about', icon: 'information-circle' },
        { label: t('nav.blog'), to: '/articles', icon: 'document' }
      ]
    }

    return [
      { label: t('nav.calendar'), to: '/calendar', icon: 'calendar' },
      { label: t('nav.timeline'), to: '/timeline', icon: 'clock' },
      { label: t('nav.diaries'), to: '/diaries', icon: 'document-text' },
      { label: t('nav.howToUse'), to: '/how-to-use', icon: 'map' },
      { label: t('nav.stocks'), to: '/stocks', icon: 'chart-bar' },
      { label: t('nav.watchlist'), to: '/stocks/watchlist', icon: 'eye' },
      { label: t('nav.about'), to: '/about', icon: 'information-circle' }
    ]
  })

  const toolNavItems = computed<NavItem[]>(() => {
    const commonTools = [
      { label: t('nav.financialFreedom'), to: '/tools/financial-freedom', icon: 'calculator' },
      { label: t('nav.positionSizing'), to: '/tools/position-sizing', icon: 'calculator' },
      { label: t('nav.seasonality'), to: '/tools/seasonality', icon: 'chart-bar' },
      { label: t('nav.etf'), to: '/tools/etf', icon: 'chart-bar' },
      { label: t('nav.relativeValue'), to: '/tools/relative-value', icon: 'chart-bar' }
    ]

    if (!isAuthenticated.value) {
      return commonTools
    }

    return [
      { label: t('nav.discipline'), to: '/discipline', icon: 'light-bulb' },
      { label: t('nav.alerts'), to: '/alerts', icon: 'bell' },
      { label: t('nav.blog'), to: '/articles', icon: 'document-text' },
      ...commonTools
    ]
  })

  const isActive = (to: string) => {
    if (to === '/') return route.path === '/'
    return route.path === to || route.path.startsWith(to + '/')
  }

  // Combined nav items for bottom navigation (mobile)
  const allNavItems = computed<NavItem[]>(() => [...mainNavItems.value, ...toolNavItems.value])
  const bottomNavItems = computed<NavItem[]>(() => {
    return BOTTOM_NAV_ROUTES.map(route => {
      const found = allNavItems.value.find(item => item.to === route)
      if (found) return found
      // Fallback for missing routes (should not happen with proper configuration)
      const fallbackMap: Record<string, NavItem> = {
        '/': { label: 'Home', to: '/', icon: 'home' },
        '/stocks': { label: 'Stocks', to: '/stocks', icon: 'chart-bar' },
        '/diaries': { label: 'Diaries', to: '/diaries', icon: 'document-text' },
        '/alerts': { label: 'Alerts', to: '/alerts', icon: 'bell' },
        '/settings': { label: 'Settings', to: '/settings', icon: 'cog-6-tooth' }
      }
      return fallbackMap[route] || { label: 'Unknown', to: route, icon: 'question-mark-circle' }
    })
  })

  return {
    isAuthenticated,
    user,
    mainNavItems,
    toolNavItems,
    allNavItems,
    bottomNavItems,
    isActive,
    FEATURED_TOOLS_COUNT
  }
}
