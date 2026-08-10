import { computed } from 'vue'
import { AUTHENTICATED_HOME_ROUTE, GUEST_HOME_ROUTE } from '~/lib/routes'

export { AUTHENTICATED_HOME_ROUTE, GUEST_HOME_ROUTE } from '~/lib/routes'

// Featured tools: first N tools shown prominently on desktop nav
const FEATURED_TOOLS_COUNT = 3

interface NavItem {
  label: string
  to: string
  icon: string
  auth?: boolean // true = only auth, false = only guest, undefined = both
  admin?: boolean // true = only admin
  /** Stable key for list rendering when multiple items share the same route */
  id?: string
}

export interface BottomNavItem {
  id: 'timeline' | 'portfolio' | 'quick-diary' | 'review' | 'more'
  label: string
  icon: string
  to?: string
  action?: 'quick-diary' | 'more'
}

type NavGroupId = 'journal' | 'portfolio' | 'research' | 'more'

interface NavGroup {
  id: NavGroupId
  label: string
  icon: string
  items: NavItem[]
}

export const useNavigation = () => {
  const { isAuthenticated, user } = useAuth()
  const route = useRoute()
  const { t } = useI18n()

  // Single source of truth for Logo / Home destinations
  const homeRoute = computed(() => (
    isAuthenticated.value ? AUTHENTICATED_HOME_ROUTE : GUEST_HOME_ROUTE
  ))

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
      { label: t('nav.reviewQueue'), to: '/reviews', icon: 'clipboard-document-check' },
      { label: t('nav.tradePlans'), to: '/trade-plans', icon: 'clipboard-document-list' },
      { label: t('nav.strategyPerformance'), to: '/strategy-performance', icon: 'chart-pie' },
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
      { label: t('nav.secFilings'), to: '/tools/sec-filings', icon: 'document-arrow-down' },
      { label: t('nav.marketRotation'), to: '/tools/market-rotation', icon: 'chart-bar' },
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

  // Grouped navigation for authenticated desktop nav.
  // Each group renders as a dropdown; a group is "active" when any child route is active.
  const desktopNavGroups = computed<NavGroup[]>(() => {
    if (!isAuthenticated.value) return []

    return [
      {
        id: 'journal',
        label: t('nav.journal'),
        icon: 'book-open',
        items: [
          { label: t('nav.diaries'), to: '/diaries', icon: 'document-text' },
          { label: t('nav.calendar'), to: '/calendar', icon: 'calendar' },
          { label: t('nav.reviewQueue'), to: '/reviews', icon: 'clipboard-document-check' },
          { label: t('nav.tradePlans'), to: '/trade-plans', icon: 'clipboard-document-list' },
        ],
      },
      {
        id: 'portfolio',
        label: t('nav.portfolio'),
        icon: 'chart-bar',
        items: [
          { label: t('nav.stocks'), to: '/stocks', icon: 'chart-bar' },
          { id: 'companies', label: t('nav.companies'), to: '/stocks/watchlist', icon: 'eye' },
          { label: t('nav.strategyPerformance'), to: '/strategy-performance', icon: 'chart-pie' },
          { label: t('nav.positionSizing'), to: '/tools/position-sizing', icon: 'calculator' },
        ],
      },
      {
        id: 'research',
        label: t('nav.research'),
        icon: 'magnifying-glass',
        items: [
          { label: t('nav.marketRotation'), to: '/tools/market-rotation', icon: 'chart-bar' },
          { label: t('nav.relativeValue'), to: '/tools/relative-value', icon: 'scale' },
          { label: t('nav.seasonality'), to: '/tools/seasonality', icon: 'chart-bar' },
          { label: t('nav.secFilings'), to: '/tools/sec-filings', icon: 'document-arrow-down' },
        ],
      },
      {
        id: 'more',
        label: t('nav.more'),
        icon: 'ellipsis-horizontal',
        items: [
          { label: t('nav.alerts'), to: '/alerts', icon: 'bell' },
          { label: t('nav.partners'), to: '/partners', icon: 'user-group' },
          { label: t('nav.discipline'), to: '/discipline', icon: 'light-bulb' },
          { label: t('nav.financialFreedom'), to: '/tools/financial-freedom', icon: 'calculator' },
          { label: t('nav.blog'), to: '/articles', icon: 'document' },
          { label: t('nav.howToUse'), to: '/how-to-use', icon: 'map' },
          { label: t('nav.about'), to: '/about', icon: 'information-circle' },
          { label: t('nav.settings'), to: '/settings', icon: 'cog-6-tooth' },
        ],
      },
    ]
  })

  const isGroupActive = (group: NavGroup) => group.items.some(item => isActive(item.to))

  // Combined route inventory for secondary/mobile menus.
  const allNavItems = computed<NavItem[]>(() => [...mainNavItems.value, ...toolNavItems.value])
  const bottomNavItems = computed<BottomNavItem[]>(() => [
    { id: 'timeline', label: t('nav.overview'), to: '/timeline', icon: 'clock' },
    { id: 'portfolio', label: t('nav.portfolio'), to: '/stocks', icon: 'chart-bar' },
    { id: 'quick-diary', label: t('diary.quickDiary'), icon: 'pencil-square', action: 'quick-diary' },
    { id: 'review', label: t('nav.reviewQueue'), to: '/reviews', icon: 'clipboard-document-check' },
    { id: 'more', label: t('nav.more'), icon: 'ellipsis-horizontal', action: 'more' },
  ])

  const isBottomNavActive = (item: BottomNavItem) => {
    if (item.to) return isActive(item.to)
    if (item.action !== 'more') return false
    return !['/timeline', '/stocks', '/reviews'].some(path => isActive(path))
  }

  return {
    isAuthenticated,
    user,
    homeRoute,
    mainNavItems,
    toolNavItems,
    allNavItems,
    bottomNavItems,
    desktopNavGroups,
    isActive,
    isGroupActive,
    isBottomNavActive,
    FEATURED_TOOLS_COUNT
  }
}
