import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from './database.js'
import type { User } from '@prisma/client'

/**
 * 測試用戶配置
 */
export interface TestUserConfig {
  email?: string
  password?: string
  name?: string
  expectedMonthlyTrades?: number
  expectedProfit?: number | string
  expectedAvgHolding?: number | string
}

/**
 * 建立測試用戶
 */
export async function createAuthTestUser(config: TestUserConfig = {}) {
  const hashedPassword = await bcrypt.hash(config.password || 'password123', 10)

  return prisma.user.create({
    data: {
      email: config.email || `test-${Date.now()}@example.com`,
      password: hashedPassword,
      name: config.name || 'Test User',
      expectedMonthlyTrades: config.expectedMonthlyTrades || 20,
      expectedProfit: config.expectedProfit || 5000,
      expectedAvgHolding: config.expectedAvgHolding || 100000,
    },
  })
}

/**
 * 建立管理員用戶
 */
export async function createAdminUser(config: TestUserConfig = {}) {
  const hashedPassword = await bcrypt.hash(config.password || 'admin123', 10)

  return prisma.user.create({
    data: {
      email: config.email || `admin-${Date.now()}@example.com`,
      password: hashedPassword,
      name: config.name || 'Admin User',
      expectedMonthlyTrades: config.expectedMonthlyTrades || 20,
      expectedProfit: config.expectedProfit || 5000,
      expectedAvgHolding: config.expectedAvgHolding || 100000,
    },
  })
}

/**
 * 生成測試用 JWT Token
 */
export function generateTestToken(userId: bigint | string, secret = 'test-secret-key'): string {
  return jwt.sign(
    { userId: userId.toString() },
    secret,
    { expiresIn: '1h' }
  )
}

/**
 * 生成過期的 JWT Token
 */
export function generateExpiredToken(userId: bigint | string, secret = 'test-secret-key'): string {
  return jwt.sign(
    { userId: userId.toString() },
    secret,
    { expiresIn: '-1h' } // 已過期
  )
}

/**
 * 驗證 JWT Token
 */
export function verifyTestToken(token: string, secret = 'test-secret-key'): { userId: string } | null {
  try {
    return jwt.verify(token, secret) as { userId: string }
  } catch {
    return null
  }
}

/**
 * 建立已認證的測試會話
 */
export async function createAuthenticatedSession(config: TestUserConfig = {}) {
  const user = await createAuthTestUser(config)
  const token = generateTestToken(user.id)

  return {
    user,
    token,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}

/**
 * 建立管理員測試會話
 */
export async function createAdminSession(config: TestUserConfig = {}) {
  const user = await createAdminUser(config)
  const token = generateTestToken(user.id)

  return {
    user,
    token,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}

/**
 * 清理測試用戶
 */
export async function cleanupTestUsers(emails: string[]) {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: emails,
      },
    },
  })
}

/**
 * 模擬登入請求
 */
export interface LoginCredentials {
  email: string
  password: string
}

export function createLoginCredentials(
  email = 'test@example.com',
  password = 'password123'
): LoginCredentials {
  return { email, password }
}

/**
 * 驗證密碼
 */
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword)
}

/**
 * 建立帶有已知密碼的測試用戶
 */
export async function createUserWithKnownPassword(
  email: string,
  plainPassword: string,
  name = 'Test User'
): Promise<User> {
  const hashedPassword = await bcrypt.hash(plainPassword, 10)

  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      expectedMonthlyTrades: 20,
      expectedProfit: 5000,
      expectedAvgHolding: 100000,
    },
  })
}
