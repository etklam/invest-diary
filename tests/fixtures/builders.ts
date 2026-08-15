/**
 * Domain-level Prisma row builders for tests.
 *
 * Keep these scalar fields in lockstep with prisma/schema.prisma. Tests should
 * override only the values relevant to the behavior under test; adding a
 * schema field then makes incomplete fixtures fail here instead of silently
 * hiding a missing field in a handler test.
 */

type FixtureDecimal = number | string
type RelationRow = Record<string, unknown>
type FixtureOverrides<T> = Partial<T> & Record<string, unknown>

export type UserFixture = {
  id: bigint
  email: string
  password: string
  name: string | null
  role: 'USER' | 'ADMIN'
  tokenVersion: number
  expectedMonthlyTrades: number
  expectedProfit: FixtureDecimal
  expectedAvgHolding: FixtureDecimal
  timezone: string
  favoriteTagsString: string | null
  createdAt: Date
  updatedAt: Date
}

export type DiaryFixture = {
  id: bigint
  userId: bigint
  title: string
  content: string | null
  tagsString: string | null
  createdVia: 'WEB' | 'API_KEY' | 'TELEGRAM_BOT'
  createdByLabel: string | null
  date: Date
  createdAt: Date
  updatedAt: Date
  thesis: string | null
  risk: string | null
  execution: string | null
  reviewDueAt: Date | null
  reviewStatus: string | null
  reviewedAt: Date | null
  reviewOutcome: string | null
  reviewSummary: string | null
  reviewLearning: string | null
  reviewAdjustment: string | null
  transactions: RelationRow[]
  alerts: RelationRow[]
}

export type TransactionFixture = {
  id: bigint
  diaryId: bigint
  userId: bigint
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: FixtureDecimal
  price: FixtureDecimal
  tradeDate: Date
  notes: string | null
  strategy: string | null
  emotion: string | null
  createdAt: Date
}

export type AlertFixture = {
  id: bigint
  diaryId: bigint
  message: string
  triggerAt: Date
  isDismissed: boolean
  recurringMode: string | null
  parentId: bigint | null
  instanceNumber: number | null
  isPaused: boolean
  createdAt: Date
  diary?: RelationRow
}

export type StockNoteFixture = {
  id: bigint
  userId: bigint
  stockId: bigint
  title: string
  content: string
  date: Date
  createdVia: 'USER' | 'AGENT'
  createdByLabel: string | null
  createdAt: Date
  updatedAt: Date
  stock?: RelationRow
}

export type PostFixture = {
  id: bigint
  authorId: bigint
  title: string
  slug: string
  content: string
  excerpt: string | null
  coverImage: string | null
  category: string
  tags: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  author?: RelationRow
}

const defaultDate = new Date('2026-08-16T12:00:00.000Z')

export function aUser(overrides: FixtureOverrides<UserFixture> = {}): UserFixture {
  return {
    id: 1n,
    email: 'test@example.com',
    password: 'hashed-password',
    name: 'Test User',
    role: 'USER',
    tokenVersion: 0,
    expectedMonthlyTrades: 20,
    expectedProfit: 0,
    expectedAvgHolding: 0,
    timezone: 'Asia/Taipei',
    favoriteTagsString: null,
    createdAt: defaultDate,
    updatedAt: defaultDate,
    ...overrides,
  }
}

export function aDiary(overrides: FixtureOverrides<DiaryFixture> = {}): DiaryFixture {
  return {
    id: 1n,
    userId: 1n,
    title: 'Test Diary',
    content: 'Some content',
    tagsString: null,
    createdVia: 'WEB',
    createdByLabel: null,
    date: defaultDate,
    createdAt: defaultDate,
    updatedAt: defaultDate,
    thesis: null,
    risk: null,
    execution: null,
    reviewDueAt: null,
    reviewStatus: 'none',
    reviewedAt: null,
    reviewOutcome: null,
    reviewSummary: null,
    reviewLearning: null,
    reviewAdjustment: null,
    transactions: [],
    alerts: [],
    ...overrides,
  }
}

export function aTransaction(overrides: FixtureOverrides<TransactionFixture> = {}): TransactionFixture {
  return {
    id: 1n,
    diaryId: 1n,
    userId: 1n,
    symbol: 'AAPL',
    type: 'BUY',
    quantity: 1,
    price: 100,
    tradeDate: defaultDate,
    notes: null,
    strategy: null,
    emotion: null,
    createdAt: defaultDate,
    ...overrides,
  }
}

export function anAlert(overrides: FixtureOverrides<AlertFixture> = {}): AlertFixture {
  return {
    id: 1n,
    diaryId: 1n,
    message: 'Test alert',
    triggerAt: defaultDate,
    isDismissed: false,
    recurringMode: null,
    parentId: null,
    instanceNumber: 1,
    isPaused: false,
    createdAt: defaultDate,
    ...overrides,
  }
}

export function aStockNote(overrides: FixtureOverrides<StockNoteFixture> = {}): StockNoteFixture {
  const noteDate = new Date('2026-05-18T00:00:00.000Z')
  const noteTimestamp = new Date('2026-05-18T12:00:00.000Z')
  return {
    id: 1n,
    userId: 1n,
    stockId: 1n,
    title: 'Quarterly thesis update',
    content: 'Earnings continue to grow. Maintaining overweight.',
    date: noteDate,
    createdVia: 'USER',
    createdByLabel: null,
    createdAt: noteTimestamp,
    updatedAt: noteTimestamp,
    stock: { symbol: 'AAPL', name: 'Apple Inc.' },
    ...overrides,
  }
}

export function aPost(overrides: FixtureOverrides<PostFixture> = {}): PostFixture {
  return {
    id: 1n,
    authorId: 1n,
    title: 'Test post',
    slug: 'test-post',
    content: 'Some post content',
    excerpt: null,
    coverImage: null,
    category: 'general',
    tags: null,
    status: 'DRAFT',
    publishedAt: null,
    createdAt: defaultDate,
    updatedAt: defaultDate,
    ...overrides,
  }
}
