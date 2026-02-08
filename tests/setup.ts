import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

/**
 * Test database utilities
 *
 * For API integration tests, we'll use a test database approach:
 * 1. Use environment variable to switch to test database
 * 2. Clean up database before each test
 * 3. Seed test data as needed
 */

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

/**
 * Clean all database tables
 */
export async function cleanDatabase() {
  // Delete in order due to foreign key constraints
  await prisma.alert.deleteMany({})
  await prisma.transaction.deleteMany({})
  await prisma.diary.deleteMany({})
  await prisma.user.deleteMany({})
}

/**
 * Create a test user
 */
export async function createTestUser(overrides: any = {}) {
  const hashedPassword = await bcrypt.hash('password123', 10)

  return prisma.user.create({
    data: {
      email: overrides.email || 'test@example.com',
      password: hashedPassword,
      name: overrides.name || 'Test User',
      expectedMonthlyTrades: overrides.expectedMonthlyTrades || 20,
      expectedProfit: overrides.expectedProfit || 5000,
      expectedAvgHolding: overrides.expectedAvgHolding || 100000,
    },
  })
}

/**
 * Create a test diary with optional transactions and alerts
 */
export async function createTestDiary(overrides: any = {}) {
  // Create or get test user
  let user = await prisma.user.findFirst({
    where: { email: 'test@example.com' }
  })

  if (!user) {
    user = await createTestUser()
  }

  return prisma.diary.create({
    data: {
      userId: user.id,
      title: overrides.title || 'Test Diary',
      content: overrides.content || 'Test content',
      date: overrides.date || new Date('2024-01-01'),
      transactions: overrides.transactions
        ? {
            create: overrides.transactions,
          }
        : undefined,
      alerts: overrides.alerts
        ? {
            create: overrides.alerts,
          }
        : undefined,
    },
    include: {
      transactions: true,
      alerts: true,
    },
  })
}

/**
 * Disconnect Prisma client
 */
export async function disconnectDatabase() {
  await prisma.$disconnect()
}

export { prisma as testPrisma }
