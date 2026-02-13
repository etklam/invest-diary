import { ref, computed } from 'vue'

// 導航項目接口
export interface NavigationItem {
  name: string
  label: string
  to: string
  icon?: any
  badge?: number | null
  disabled?: boolean
  requiresAuth?: boolean
  roles?: string[]
}

// 導航歷史項目
export interface NavigationHistoryItem {
  path: string
  name?: string
  timestamp: number
  title?: string
}

// 導航狀態接口
export interface NavigationState {
  currentPath: string
  previousPath: string | null
  history: NavigationHistoryItem[]
  isNavigating: boolean
  navigationDirection: 'forward' | 'backward' | 'none'
}

// 簡單的狀態管理實現（不依賴 Pinia）
let navigationState: NavigationState = {
  currentPath: '/',
  previousPath: null,
  history: [],
  isNavigating: false,
  navigationDirection: 'none'
}

let listeners: Array<(state: NavigationState) => void> = []

export function useNavigationStore() {
  const navigationItems = ref<NavigationItem[]>([
    {
      name: 'home',
      label: '首頁',
      to: '/',
      badge: null,
      requiresAuth: false
    },
    {
      name: 'holdings',
      label: '持股',
      to: '/stocks',
      badge: null,
      requiresAuth: true
    },
    {
      name: 'diaries',
      label: '日記',
      to: '/diaries',
      badge: null,
      requiresAuth: true
    },
    {
      name: 'alerts',
      label: '提醒',
      to: '/alerts',
      badge: null,
      requiresAuth: true
    },
    {
      name: 'settings',
      label: '設定',
      to: '/settings',
      badge: null,
      requiresAuth: true
    }
  ])

  // 計算屬性
  const currentNavigationItem = computed(() => {
    return navigationItems.value.find(item => item.to === navigationState.currentPath)
  })

  const canGoBack = computed(() => {
    return navigationState.history.length > 1
  })

  const backPath = computed(() => {
    if (navigationState.history.length > 1) {
      const previousItem = navigationState.history[navigationState.history.length - 2]
      return previousItem?.path || '/'
    }
    return '/'
  })

  // 方法
  const setCurrentPath = (path: string, title?: string) => {
    navigationState.previousPath = navigationState.currentPath
    navigationState.currentPath = path
    
    // 添加到歷史記錄
    const historyItem: NavigationHistoryItem = {
      path,
      timestamp: Date.now(),
      title
    }
    
    // 避免重複添加相同路徑
    if (navigationState.history.length === 0 || 
        navigationState.history[navigationState.history.length - 1]?.path !== path) {
      navigationState.history.push(historyItem)
      
      // 限制歷史記錄長度
      if (navigationState.history.length > 50) {
        navigationState.history = navigationState.history.slice(-50)
      }
    }
    
    // 通知監聽器
    notifyListeners()
    
    // 持久化到本地存儲
    saveToLocalStorage()
  }

  const setNavigationDirection = (direction: 'forward' | 'backward' | 'none') => {
    navigationState.navigationDirection = direction
    notifyListeners()
  }

  const setNavigating = (navigating: boolean) => {
    navigationState.isNavigating = navigating
    notifyListeners()
  }

  const updateNavigationItem = (name: string, updates: Partial<NavigationItem>) => {
    const item = navigationItems.value.find(nav => nav.name === name)
    if (item) {
      Object.assign(item, updates)
      saveToLocalStorage()
    }
  }

  const updateBadge = (name: string, count: number | null) => {
    updateNavigationItem(name, { badge: count })
  }

  const addNavigationItem = (item: NavigationItem) => {
    navigationItems.value.push(item)
    saveToLocalStorage()
  }

  const removeNavigationItem = (name: string) => {
    const index = navigationItems.value.findIndex(nav => nav.name === name)
    if (index > -1) {
      navigationItems.value.splice(index, 1)
      saveToLocalStorage()
    }
  }

  const clearHistory = () => {
    navigationState.history = []
    notifyListeners()
    saveToLocalStorage()
  }

  const goBack = () => {
    if (canGoBack.value) {
      setNavigationDirection('backward')
      return backPath.value
    }
    return '/'
  }

  const filterNavigationItems = (userRoles: string[] = []) => {
    return navigationItems.value.filter(item => {
      if (item.disabled) return false
      if (item.requiresAuth && userRoles.length === 0) return false
      if (item.roles && item.roles.length > 0) {
        return item.roles.some(role => userRoles.includes(role))
      }
      return true
    })
  }

  // 本地存儲
  const saveToLocalStorage = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = {
          currentPath: navigationState.currentPath,
          history: navigationState.history.slice(-20), // 只保存最近20條記錄
          navigationItems: navigationItems.value.map(item => ({
            name: item.name,
            label: item.label,
            to: item.to,
            badge: item.badge,
            disabled: item.disabled
          }))
        }
        localStorage.setItem('navigation-state', JSON.stringify(data))
      } catch (error) {
        console.warn('Failed to save navigation state to localStorage:', error)
      }
    }
  }

  const loadFromLocalStorage = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = localStorage.getItem('navigation-state')
        if (data) {
          const parsed = JSON.parse(data)
          
          if (parsed.currentPath) {
            navigationState.currentPath = parsed.currentPath
          }
          
          if (parsed.history && Array.isArray(parsed.history)) {
            navigationState.history = parsed.history
          }
          
          if (parsed.navigationItems && Array.isArray(parsed.navigationItems)) {
            // 合並本地存儲的導航項目配置
            parsed.navigationItems.forEach((savedItem: any) => {
              const existingItem = navigationItems.value.find(item => item.name === savedItem.name)
              if (existingItem) {
                Object.assign(existingItem, savedItem)
              }
            })
          }
        }
      } catch (error) {
        console.warn('Failed to load navigation state from localStorage:', error)
      }
    }
  }

  const clearLocalStorage = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem('navigation-state')
      } catch (error) {
        console.warn('Failed to clear navigation state from localStorage:', error)
      }
    }
  }

  // 監聽器管理
  const subscribe = (listener: (state: NavigationState) => void) => {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  }

  const notifyListeners = () => {
    listeners.forEach(listener => listener(navigationState))
  }

  // 初始化
  const init = () => {
    loadFromLocalStorage()
    
    // 監聽頁面可見性變化，恢復導航狀態
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          loadFromLocalStorage()
        }
      })
    }
  }

  // 重置狀態
  const reset = () => {
    navigationState = {
      currentPath: '/',
      previousPath: null,
      history: [],
      isNavigating: false,
      navigationDirection: 'none'
    }
    notifyListeners()
    clearLocalStorage()
  }

  // 獲取當前狀態
  const getState = (): NavigationState => {
    return navigationState
  }

  return {
    // 狀態（通過計算屬性訪問）
    currentPath: computed(() => navigationState.currentPath),
    previousPath: computed(() => navigationState.previousPath),
    history: computed(() => navigationState.history),
    isNavigating: computed(() => navigationState.isNavigating),
    navigationDirection: computed(() => navigationState.navigationDirection),
    navigationItems,
    
    // 計算屬性
    currentNavigationItem,
    canGoBack,
    backPath,
    
    // 方法
    setCurrentPath,
    setNavigationDirection,
    setNavigating,
    updateNavigationItem,
    updateBadge,
    addNavigationItem,
    removeNavigationItem,
    clearHistory,
    goBack,
    filterNavigationItems,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,
    subscribe,
    init,
    reset,
    getState
  }
}

// 類型導出
export type NavigationStore = ReturnType<typeof useNavigationStore>