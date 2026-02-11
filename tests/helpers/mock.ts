import { vi } from 'vitest'

/**
 * Mock Prisma Client
 */
export function mockPrisma() {
  const mockPrisma = {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    diary: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    alert: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    discipline: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
  }

  return mockPrisma
}

/**
 * Mock Nuxt Composables
 */
export function mockNuxtComposable(name: string, returnValue: any = {}) {
  vi.mock('#app', () => ({
    [name]: () => returnValue,
  }))

  return returnValue
}

/**
 * Mock useAuth composable
 */
export function mockUseAuth(overrides: any = {}) {
  const defaultAuth = {
    user: null,
    token: null,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    isAuthenticated: false,
    isAdmin: false,
    ...overrides,
  }

  const mockFunction = mockNuxtComposable('useAuth', defaultAuth)
  return mockFunction
}

/**
 * Mock useToast composable
 */
export function mockUseToast(overrides: any = {}) {
  const defaultToast = {
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    ...overrides,
  }

  const mockFunction = mockNuxtComposable('useToast', defaultToast)
  return mockFunction
}

/**
 * Mock useNavigation composable
 */
export function mockUseNavigation(overrides: any = {}) {
  const defaultNavigation = {
    navigationItems: [
      { label: '月曆', to: '/', auth: undefined },
      { label: '時間軸', to: '/timeline', auth: true },
      { label: '日記列表', to: '/diaries', auth: true },
      { label: '提醒管理', to: '/alerts', auth: true },
      { label: '股票管理', to: '/stocks', auth: true }
    ],
    ...overrides,
  }

  const mockFunction = mockNuxtComposable('useNavigation', defaultNavigation)
  return mockFunction
}

/**
 * Mock HTTP Request
 */
export function mockFetch(response: any, options: { status?: number; delay?: number } = {}) {
  const mockFetch = vi.fn()
  
  mockFetch.mockImplementation(() =>
    new Promise((resolve) => {
      if (options.delay) {
        setTimeout(() => {
          resolve({
            ok: options.status ? options.status < 400 : true,
            status: options.status || 200,
            json: () => Promise.resolve(response),
          })
        }, options.delay)
      } else {
        resolve({
          ok: options.status ? options.status < 400 : true,
          status: options.status || 200,
          json: () => Promise.resolve(response),
        })
      }
    })
  )

  global.fetch = mockFetch
  return mockFetch
}

/**
 * Mock localStorage
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {}

  const localStorageMock = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })

  return localStorageMock
}

/**
 * Mock sessionStorage
 */
export function mockSessionStorage() {
  const store: Record<string, string> = {}

  const sessionStorageMock = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }

  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  })

  return sessionStorageMock
}

/**
 * Mock Timer
 */
export function mockTimer() {
  vi.useFakeTimers()
  return {
    advanceTimersByTime: vi.advanceTimersByTime,
    advanceTimersToNextTimer: vi.advanceTimersToNextTimer,
    runAllTimers: vi.runAllTimers,
    useRealTimers: vi.useRealTimers,
  }
}

/**
 * 清理所有 mocks
 */
export function clearAllMocks() {
  vi.clearAllMocks()
  vi.restoreAllMocks()
}

/**
 * 建立測試資料
 */
export function createMockData() {
  return {
    user: {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      expectedMonthlyTrades: 20,
      expectedProfit: 5000,
      expectedAvgHolding: 100000,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    diary: {
      id: 1,
      userId: 1,
      title: 'Test Diary',
      content: 'Test content',
      date: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    transaction: {
      id: 1,
      diaryId: 1,
      symbol: '2330.TW',
      type: 'BUY',
      quantity: 10,
      price: 500,
      tradeDate: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    },
    alert: {
      id: 1,
      diaryId: 1,
      message: 'Test alert',
      triggerAt: new Date('2024-01-01'),
      isDismissed: false,
      createdAt: new Date('2024-01-01'),
    },
  }
}
