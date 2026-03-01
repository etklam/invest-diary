import { PrismaClient, UserRole, TransactionType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createPrismaClientOptions } from '../../lib/prisma-client-options'

/**
 * 測試用 Prisma Client
 */
export const prisma = new PrismaClient(createPrismaClientOptions())

/**
 * 清理所有資料庫表
 */
export async function cleanDatabase() {
  // 按照外鍵依賴順序刪除
  await prisma.alert.deleteMany({})
  await prisma.transaction.deleteMany({})
  await prisma.discipline.deleteMany({})
  await prisma.diary.deleteMany({})
  await prisma.user.deleteMany({})
}

/**
 * 測試用戶輸入類型
 */
export interface TestUserInput {
  email?: string
  password?: string
  name?: string
  role?: UserRole
  expectedMonthlyTrades?: number
  expectedProfit?: number | string
  expectedAvgHolding?: number | string
}

/**
 * 建立測試用戶
 */
export async function createTestUser(overrides: TestUserInput = {}) {
  const hashedPassword = await bcrypt.hash(overrides.password || 'password123', 10)

  return prisma.user.create({
    data: {
      email: overrides.email || `test-${Date.now()}@example.com`,
      password: hashedPassword,
      name: overrides.name || 'Test User',
      role: overrides.role || UserRole.USER,
      expectedMonthlyTrades: overrides.expectedMonthlyTrades || 20,
      expectedProfit: overrides.expectedProfit || 5000,
      expectedAvgHolding: overrides.expectedAvgHolding || 100000,
    },
  })
}

/**
 * 建立管理員用戶
 */
export async function createAdminUser(overrides: Omit<TestUserInput, 'role'> = {}) {
  return createTestUser({
    ...overrides,
    role: UserRole.ADMIN,
    email: overrides.email || `admin-${Date.now()}@example.com`,
    name: overrides.name || 'Admin User',
  })
}

/**
 * 測試日記輸入類型
 */
export interface TestDiaryInput {
  userId?: bigint
  title?: string
  content?: string
  date?: Date
}

/**
 * 建立測試日記
 */
export async function createTestDiary(overrides: TestDiaryInput = {}) {
  let user
  
  if (overrides.userId) {
    user = await prisma.user.findUnique({ where: { id: overrides.userId } })
  }
  
  if (!user) {
    user = await prisma.user.findFirst({
      where: { email: 'test@example.com' },
    })
  }

  if (!user) {
    user = await createTestUser({ email: 'test@example.com' })
  }

  return prisma.diary.create({
    data: {
      userId: user.id,
      title: overrides.title || 'Test Diary',
      content: overrides.content || 'Test content',
      date: overrides.date || new Date('2024-01-01'),
    },
    include: {
      transactions: true,
      alerts: true,
    },
  })
}

/**
 * 測試交易輸入類型
 */
export interface TestTransactionInput {
  diaryId?: bigint
  symbol?: string
  type?: TransactionType
  quantity?: number | string
  price?: number | string
  tradeDate?: Date
}

/**
 * 建立測試交易
 */
export async function createTestTransaction(overrides: TestTransactionInput = {}) {
  let diary

  if (overrides.diaryId) {
    diary = await prisma.diary.findUnique({ where: { id: overrides.diaryId } })
  }

  if (!diary) {
    diary = await prisma.diary.findFirst()
  }

  if (!diary) {
    diary = await createTestDiary()
  }

  return prisma.transaction.create({
    data: {
      diaryId: diary.id,
      symbol: overrides.symbol || '2330.TW',
      type: overrides.type || TransactionType.BUY,
      quantity: overrides.quantity || 10,
      price: overrides.price || 500,
      tradeDate: overrides.tradeDate || new Date(),
    },
  })
}

/**
 * 測試提醒輸入類型
 */
export interface TestAlertInput {
  diaryId?: bigint
  message?: string
  triggerAt?: Date
  isDismissed?: boolean
}

/**
 * 建立測試提醒
 */
export async function createTestAlert(overrides: TestAlertInput = {}) {
  let diary

  if (overrides.diaryId) {
    diary = await prisma.diary.findUnique({ where: { id: overrides.diaryId } })
  }

  if (!diary) {
    diary = await prisma.diary.findFirst()
  }

  if (!diary) {
    diary = await createTestDiary()
  }

  return prisma.alert.create({
    data: {
      diaryId: diary.id,
      message: overrides.message || 'Test alert',
      triggerAt: overrides.triggerAt || new Date(Date.now() + 86400000), // 預設明天
      isDismissed: overrides.isDismissed || false,
    },
  })
}

/**
 * 測試自律事項輸入類型
 */
export interface TestDisciplineInput {
  userId?: bigint
  content?: string
}

/**
 * 建立測試自律事項
 */
export async function createTestDiscipline(overrides: TestDisciplineInput = {}) {
  let user

  if (overrides.userId) {
    user = await prisma.user.findUnique({ where: { id: overrides.userId } })
  }

  if (!user) {
    user = await prisma.user.findFirst()
  }

  if (!user) {
    user = await createTestUser()
  }

  return prisma.discipline.create({
    data: {
      userId: user.id,
      content: overrides.content || 'Test discipline',
    },
  })
}

/**
 * 斷開資料庫連線
 */
export async function disconnectDatabase() {
  await prisma.$disconnect()
}

/**
 * 重新連接資料庫
 */
export async function connectDatabase() {
  await prisma.$connect()
}

/**
 * 種子資料 - 基本測試數據
 */
export async function seedTestData() {
  const user = await createTestUser({
    email: 'seed@example.com',
    name: 'Seed User',
  })

  const diary = await createTestDiary({
    userId: user.id,
    title: 'Seed Diary',
    content: 'Seed content for testing',
  })

  const transaction = await createTestTransaction({
    diaryId: diary.id,
  })

  const alert = await createTestAlert({
    diaryId: diary.id,
  })

  const discipline = await createTestDiscipline({
    userId: user.id,
  })

  return { user, diary, transaction, alert, discipline }
}
