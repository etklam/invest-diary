import prisma from '~/lib/prisma'

/**
 * Telegram DB operations — lives in server/utils/ to avoid Vite bundling Prisma.
 * All lib/telegram/ code calls these functions instead of importing prisma directly.
 */

// ─── Telegram Account ──────────────────────────────────────────────────────

export async function findTelegramAccount(telegramId: bigint | number) {
  return prisma.telegramAccount.findUnique({
    where: { telegramId: BigInt(telegramId.toString()) },
  })
}

export async function createTelegramAccount(data: {
  telegramId: bigint | number
  userId: bigint | number
  username?: string | null
  firstName?: string | null
  lastName?: string | null
  language?: string
}) {
  return prisma.telegramAccount.create({
    data: {
      telegramId: BigInt(data.telegramId.toString()),
      userId: BigInt(data.userId.toString()),
      username: data.username ?? null,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      language: data.language ?? 'zh-TW',
    },
  })
}

export async function updateTelegramLanguage(telegramId: bigint | number, language: string) {
  return prisma.telegramAccount.update({
    where: { telegramId: BigInt(telegramId.toString()) },
    data: { language, lastActiveAt: new Date() },
  })
}

export async function touchTelegramAccount(telegramId: bigint | number) {
  return prisma.telegramAccount.update({
    where: { telegramId: BigInt(telegramId.toString()) },
    data: { lastActiveAt: new Date() },
  })
}

export async function deleteTelegramAccount(telegramId: bigint | number) {
  return prisma.telegramAccount.delete({
    where: { telegramId: BigInt(telegramId.toString()) },
  })
}

// ─── Verification Codes ────────────────────────────────────────────────────

export async function createVerificationCode(userId: bigint | number): Promise<string> {
  const code = generateCode()

  // Limit to 3 unused codes per user
  const activeCount = await prisma.telegramVerificationCode.count({
    where: { userId: BigInt(userId.toString()), usedAt: null, expiresAt: { gt: new Date() } },
  })
  if (activeCount >= 3) {
    // Delete oldest
    const oldest = await prisma.telegramVerificationCode.findFirst({
      where: { userId: BigInt(userId.toString()), usedAt: null },
      orderBy: { createdAt: 'asc' },
    })
    if (oldest) {
      await prisma.telegramVerificationCode.delete({ where: { id: oldest.id } })
    }
  }

  await prisma.telegramVerificationCode.create({
    data: {
      userId: BigInt(userId.toString()),
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  })
  return code
}

export async function verifyAndConsumeCode(code: string): Promise<bigint | null> {
  const record = await prisma.telegramVerificationCode.findUnique({ where: { code } })
  if (!record) return null
  if (record.usedAt) return null
  if (record.expiresAt < new Date()) return null

  await prisma.telegramVerificationCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  })
  return record.userId
}

// ─── Session Adapter ────────────────────────────────────────────────────────

export async function sessionRead(key: string): Promise<Record<string, unknown> | undefined> {
  const session = await prisma.telegramSession.findUnique({ where: { id: `session:${key}` } })
  if (!session) return undefined
  if (session.expiresAt < new Date()) return undefined
  return session.value as unknown as Record<string, unknown>
}

export async function sessionWrite(key: string, value: Record<string, unknown>): Promise<void> {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minute TTL
  await prisma.telegramSession.upsert({
    where: { id: `session:${key}` },
    create: { id: `session:${key}`, key, value: value as unknown as PrismaJson, expiresAt },
    update: { value: value as unknown as PrismaJson, expiresAt },
  })
}

export async function sessionDelete(key: string): Promise<void> {
  try {
    await prisma.telegramSession.delete({ where: { id: `session:${key}` } })
  } catch {
    // Already deleted — no-op
  }
}

// ─── Idempotency ────────────────────────────────────────────────────────────

export async function checkAndMarkUpdate(updateId: number, action: string): Promise<boolean> {
  try {
    await prisma.telegramProcessedUpdate.create({
      data: { updateId, action },
    })
    return true // Not processed yet, proceed
  } catch {
    return false // Already processed, skip
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No 0/O/1/I to avoid confusion
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Prisma Json helper type
type PrismaJson = Record<string, unknown> | Array<unknown> | string | number | boolean | null
