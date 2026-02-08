import { computed } from 'vue'

interface NavItem {
  label: string
  to: string
  auth?: boolean // true = only auth, false = only guest, undefined = both
}

export const useNavigation = () => {
  const { isAuthenticated } = useAuth()
  const route = useRoute()

  const navItems = computed<NavItem[]>(() => [
    { label: '月曆', to: '/' },
    { label: '日記列表', to: '/diaries', auth: true },
    { label: '提醒管理', to: '/alerts', auth: true },
    { label: '股票管理', to: '/stocks', auth: true }
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
