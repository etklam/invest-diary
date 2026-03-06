import { computed } from 'vue'

interface NavItem {
  label: string
  to: string
  auth?: boolean // true = only auth, false = only guest, undefined = both
  admin?: boolean // true = only admin
}

export const useNavigation = () => {
  const { isAuthenticated, user } = useAuth()
  const route = useRoute()
  const { t } = useI18n()

  const navItems = computed<NavItem[]>(() => [
    // Home only visible for guests
    { label: t('nav.home'), to: '/', auth: false },
    { label: t('nav.blog'), to: '/acticles' },
    { label: t('nav.calendar'), to: '/calendar', auth: true },
    { label: t('nav.timeline'), to: '/timeline', auth: true },
    { label: t('nav.diaries'), to: '/diaries', auth: true },
    // Trading discipline (quotes)
    { label: t('nav.discipline'), to: '/discipline', auth: true },
    { label: t('nav.alerts'), to: '/alerts', auth: true },
    { label: t('nav.stocks'), to: '/stocks', auth: true },
    { label: t('nav.admin'), to: '/admin', auth: true, admin: true },
    { label: t('nav.manageBlog'), to: '/admin/blog', auth: true, admin: true },
    { label: t('nav.about'), to: '/about', auth: false }
  ])

  const visibleNavItems = computed(() =>
    navItems.value.filter(item => {
      // Check admin restriction
      if (item.admin) {
        return isAuthenticated.value && user.value?.role === 'ADMIN'
      }
      // Check auth restriction
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
