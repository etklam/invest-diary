import { computed } from 'vue'

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

  // 本地存儲
  const saveToLocalStorage = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = {
          currentPath: navigationState.currentPath,
          history: navigationState.history.slice(-20) // 只保存最近20條記錄
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
        }
      } catch (error) {
        console.warn('Failed to load navigation state from localStorage:', error)
      }
    }
  }

  // 監聽器管理
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

  return {
    // 狀態（通過計算屬性訪問）
    currentPath: computed(() => navigationState.currentPath),
    previousPath: computed(() => navigationState.previousPath),
    history: computed(() => navigationState.history),
    isNavigating: computed(() => navigationState.isNavigating),
    navigationDirection: computed(() => navigationState.navigationDirection),

    // 方法
    setCurrentPath,
    setNavigationDirection,
    setNavigating,
    init
  }
}
