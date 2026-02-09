import { computed } from 'vue'

interface NavItem {
  label: string
  to: string
  auth?: boolean // true = only auth, false = only guest, undefined = both
}

export const useNavigation = () => {
  const { isAuthenticated } = useAuth()
  const route = useRoute()
  const { t } = useI18n()

  const navItems = computed<NavItem[]>(() => [
    { label: t('nav.home'), to: '/' },
    { label: t('nav.calendar'), to: '/calendar', auth: true },
    { label: t('nav.timeline'), to: '/timeline', auth: true },
    { label: t('nav.diaries'), to: '/diaries', auth: true },
    { label: t('nav.alerts'), to: '/alerts', auth: true },
    { label: t('nav.stocks'), to: '/stocks', auth: true },
    { label: t('nav.about'), to: '/about' }
  ])

  const visibleNavItems = computed(() =>
    navItems.value.filter(item => {
      if (item.auth === undefined) return true
      return item.auth === isAuthenticated.value
    })
  )

  const isActive = (to: string) => {
    return route.path === to || route.path.startsWith(to + '/')
  }

  return {
    isAuthenticated,
    visibleNavItems,
    isActive
  }
}
