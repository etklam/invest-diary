import { vi } from 'vitest'

const nuxtComposableMocks = new Map<string, () => unknown>()

vi.mock('#app', async () => {
  const actual = await vi.importActual<typeof import('#app')>('#app')
  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && nuxtComposableMocks.has(prop)) {
        return nuxtComposableMocks.get(prop)
      }
      return Reflect.get(target, prop, receiver)
    },
  }) as typeof actual
})

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
  const factory = () => returnValue
  nuxtComposableMocks.set(name, factory)
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
  nuxtComposableMocks.clear()
}

/**
 * 建立測試資料
 */
export function createMockData() {
  return {
    user: {
      id: 1n,
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed-password',
      role: 'USER',
      expectedMonthlyTrades: 20,
      expectedProfit: 5000,
      expectedAvgHolding: 100000,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    diary: {
      id: 1n,
      userId: 1n,
      title: 'Test Diary',
      content: 'Test content',
      mood: 'NEUTRAL',
      date: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    transaction: {
      id: 1n,
      diaryId: 1n,
      symbol: '2330.TW',
      type: 'BUY',
      quantity: 10,
      price: 500,
      tradeDate: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    },
    alert: {
      id: 1n,
      diaryId: 1n,
      message: 'Test alert',
      triggerAt: new Date('2024-01-01'),
      isDismissed: false,
      createdAt: new Date('2024-01-01'),
    },
    post: {
      id: 1n,
      title: 'Test Blog Post',
      slug: 'test-blog-post',
      content: 'Test content for blog post',
      excerpt: 'Test excerpt',
      category: 'TECH',
      tags: 'vue,nuxt,typescript',
      status: 'PUBLISHED',
      coverImage: '/cover.jpg',
      publishedAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      authorId: 1n,
    },
    discipline: {
      id: 1n,
      content: 'Test discipline quote',
      isCustom: false,
      createdAt: new Date('2024-01-01'),
    },
  }
}

/**
 * 建立完整的 mock event物件
 */
export function createMockEvent(overrides: {
  user?: any
  params?: Record<string, string>
  body?: any
  query?: Record<string, string>
  cookies?: Record<string, string>
} = {}) {
  return {
    context: {
      user: overrides.user || null,
      params: overrides.params || {},
    },
    body: overrides.body,
    query: overrides.query || {},
    cookies: overrides.cookies || {},
  } as any
}

/**
 * 建立測試用的 transaction資料
 */
export function createMockTransaction(overrides: Partial<{
  id: bigint
  diaryId: bigint
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  tradeDate: Date
}> = {}) {
  return {
    id: overrides.id ?? 1n,
    diaryId: overrides.diaryId ?? 1n,
    symbol: overrides.symbol ?? '2330.TW',
    type: overrides.type ?? 'BUY',
    quantity: overrides.quantity ?? 10,
    price: overrides.price ?? 500,
    tradeDate: overrides.tradeDate ?? new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * 建立測試用的 blog post資料
 */
export function createMockPost(overrides: Partial<{
  id: bigint
  title: string
  slug: string
  content: string
  excerpt: string
  category: string
  tags: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  coverImage: string | null
  publishedAt: Date | null
  authorId: bigint
}> = {}) {
  return {
    id: overrides.id ?? 1n,
    title: overrides.title ?? 'Test Post',
    slug: overrides.slug ?? 'test-post',
    content: overrides.content ?? 'Test content',
    excerpt: overrides.excerpt ?? 'Test excerpt',
    category: overrides.category ?? 'TECH',
    tags: overrides.tags ?? '',
    status: overrides.status ?? 'DRAFT',
    coverImage: overrides.coverImage ?? null,
    publishedAt: overrides.publishedAt ?? null,
    authorId: overrides.authorId ?? 1n,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * 建立 mock H3 event
 */
export function mockH3Event(options: {
  body?: any
  query?: Record<string, string>
  params?: Record<string, string>
  user?: any
  cookies?: Record<string, string>
  headers?: Record<string, string>
} = {}) {
  return {
    node: {
      req: {
        headers: options.headers || {},
      },
    },
    context: {
      user: options.user || null,
      params: options.params || {},
    },
    body: options.body,
    query: options.query || {},
    cookies: options.cookies || {},
  } as any
}

/**
 * 等待條件成立
 */
export async function waitFor(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const timeout = options.timeout || 5000
  const interval = options.interval || 50
  const start = Date.now()

  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timeout exceeded')
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
}

/**
 * 建立假日期範圍
 */
export function createDateRange(start: string, end: string): Date[] {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const dates: Date[] = []
  
  const current = new Date(startDate)
  while (current <= endDate) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}
