import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so the mock object is available when vi.mock runs (hoisted to top)
const mockPrisma = vi.hoisted(() => ({
  telegramAccount: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  telegramVerificationCode: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  telegramSession: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  telegramProcessedUpdate: {
    create: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('~/lib/prisma', () => ({
  default: mockPrisma,
}))

import {
  findTelegramAccount,
  createTelegramAccount,
  verifyAndConsumeCode,
  createVerificationCode,
  checkAndMarkUpdate,
  releaseUpdate,
  cleanupExpiredTelegramData,
  sessionRead,
  sessionWrite,
  sessionDelete,
  touchTelegramAccount,
  updateTelegramLanguage,
  deleteTelegramAccount,
} from '~/server/utils/telegram-db'

describe('Telegram DB Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── findTelegramAccount ────────────────────────────────────────────

  describe('findTelegramAccount', () => {
    it('converts number to BigInt', async () => {
      mockPrisma.telegramAccount.findUnique.mockResolvedValue(null)

      await findTelegramAccount(123456)

      expect(mockPrisma.telegramAccount.findUnique).toHaveBeenCalledWith({
        where: { telegramId: BigInt(123456) },
      })
    })

    it('converts bigint to BigInt', async () => {
      mockPrisma.telegramAccount.findUnique.mockResolvedValue(null)

      await findTelegramAccount(BigInt(123456))

      expect(mockPrisma.telegramAccount.findUnique).toHaveBeenCalledWith({
        where: { telegramId: BigInt(123456) },
      })
    })

    it('returns account when found', async () => {
      const mockAccount = { telegramId: BigInt(123456), userId: BigInt(1) }
      mockPrisma.telegramAccount.findUnique.mockResolvedValue(mockAccount)

      const result = await findTelegramAccount(123456)

      expect(result).toBe(mockAccount)
    })
  })

  // ─── verifyAndConsumeCode ───────────────────────────────────────────

  describe('verifyAndConsumeCode', () => {
    it('returns success on valid code', async () => {
      const mockRecord = {
        id: 1,
        userId: BigInt(42),
        code: 'ABC123',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min in future
        usedAt: null,
      }
      mockPrisma.telegramVerificationCode.findUnique.mockResolvedValue(mockRecord)
      mockPrisma.telegramVerificationCode.update.mockResolvedValue(undefined)

      const result = await verifyAndConsumeCode('ABC123')

      expect(result).toEqual({
        success: true,
        userId: BigInt(42),
        tooManyAttempts: false,
      })
    })

    it('returns failure for non-existent code', async () => {
      mockPrisma.telegramVerificationCode.findUnique.mockResolvedValue(null)

      const result = await verifyAndConsumeCode('NOTFOUND')

      expect(result).toEqual({
        success: false,
        userId: null,
        tooManyAttempts: false,
      })
    })

    it('returns failure for already used code', async () => {
      mockPrisma.telegramVerificationCode.findUnique.mockResolvedValue({
        id: 1,
        userId: BigInt(42),
        code: 'ABC123',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        usedAt: new Date(), // already used
      })

      const result = await verifyAndConsumeCode('ABC123')

      expect(result.success).toBe(false)
    })

    it('returns failure for expired code', async () => {
      mockPrisma.telegramVerificationCode.findUnique.mockResolvedValue({
        id: 1,
        userId: BigInt(42),
        code: 'ABC123',
        expiresAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min in past
        usedAt: null,
      })

      const result = await verifyAndConsumeCode('ABC123')

      expect(result.success).toBe(false)
    })

    it('marks code as used on successful verification', async () => {
      const mockRecord = {
        id: 1,
        userId: BigInt(42),
        code: 'ABC123',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        usedAt: null,
      }
      mockPrisma.telegramVerificationCode.findUnique.mockResolvedValue(mockRecord)
      mockPrisma.telegramVerificationCode.update.mockResolvedValue(undefined)

      await verifyAndConsumeCode('ABC123')

      expect(mockPrisma.telegramVerificationCode.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { usedAt: expect.any(Date) },
      })
    })

    it('returns tooManyAttempts when attempts reach limit', async () => {
      mockPrisma.telegramVerificationCode.findUnique.mockResolvedValue({
        id: 1,
        userId: BigInt(42),
        code: 'ABC123',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        usedAt: null,
        attempts: 5, // Should trigger tooManyAttempts
      })

      const result = await verifyAndConsumeCode('ABC123')

      expect(result.tooManyAttempts).toBe(true)
      expect(result.success).toBe(false)
    })

    it('increments attempts on failed verification when code not found', async () => {
      // For a non-existent code, we can't increment attempts since we don't
      // have a record. This is expected behavior.
      mockPrisma.telegramVerificationCode.findUnique.mockResolvedValue(null)

      const result = await verifyAndConsumeCode('WRONG')

      expect(result.tooManyAttempts).toBe(false)
      // No update should be called since there's no record
      expect(mockPrisma.telegramVerificationCode.update).not.toHaveBeenCalled()
    })
  })

  // ─── checkAndMarkUpdate ──────────────────────────────────────────────

  describe('checkAndMarkUpdate', () => {
    it('returns true for new update (first processing)', async () => {
      mockPrisma.telegramProcessedUpdate.create.mockResolvedValue(undefined)

      const result = await checkAndMarkUpdate(1001, 'diary_write')

      expect(result).toBe(true)
      expect(mockPrisma.telegramProcessedUpdate.create).toHaveBeenCalledWith({
        data: { updateId: 1001, action: 'diary_write' },
      })
    })

    it('returns false for already-processed update', async () => {
      mockPrisma.telegramProcessedUpdate.create.mockRejectedValue(
        Object.assign(new Error('Unique constraint violation'), { code: 'P2002' })
      )

      const result = await checkAndMarkUpdate(1001, 'diary_write')

      expect(result).toBe(false)
    })

    it('does not treat DB failure as an already-processed update', async () => {
      mockPrisma.telegramProcessedUpdate.create.mockRejectedValue(
        new Error('DB unavailable')
      )

      await expect(checkAndMarkUpdate(1001, 'diary_write')).rejects.toThrow('DB unavailable')
    })
  })

  describe('releaseUpdate', () => {
    it('deletes the acquired update so a retry can process it again', async () => {
      mockPrisma.telegramProcessedUpdate.delete.mockResolvedValue(undefined)

      await releaseUpdate(1001)

      expect(mockPrisma.telegramProcessedUpdate.delete).toHaveBeenCalledWith({
        where: { updateId: 1001 },
      })
    })
  })

  // ─── createVerificationCode ──────────────────────────────────────────

  describe('createVerificationCode', () => {
    it('generates a 6-character code', async () => {
      mockPrisma.telegramVerificationCode.count.mockResolvedValue(0)
      mockPrisma.telegramVerificationCode.create.mockResolvedValue(undefined)

      const code = await createVerificationCode(BigInt(1))

      expect(code).toHaveLength(6)
      // Code should not contain ambiguous characters
      expect(code).not.toMatch(/[0O1I]/)
      expect(mockPrisma.telegramVerificationCode.create).toHaveBeenCalledWith({
        data: {
          userId: BigInt(1),
          code,
          expiresAt: expect.any(Date),
        },
      })
    })

    it('deletes oldest unused code when limit reached', async () => {
      mockPrisma.telegramVerificationCode.count.mockResolvedValue(3)
      mockPrisma.telegramVerificationCode.findFirst.mockResolvedValue({ id: 10 })
      mockPrisma.telegramVerificationCode.create.mockResolvedValue(undefined)

      const code = await createVerificationCode(BigInt(1))

      expect(mockPrisma.telegramVerificationCode.delete).toHaveBeenCalledWith({
        where: { id: 10 },
      })
      expect(code).toHaveLength(6)
    })
  })

  // ─── cleanupExpiredTelegramData ──────────────────────────────────────

  describe('cleanupExpiredTelegramData', () => {
    it('deletes expired sessions and old codes', async () => {
      mockPrisma.telegramSession.deleteMany.mockResolvedValue({ count: 5 })
      mockPrisma.telegramVerificationCode.deleteMany.mockResolvedValue({ count: 3 })

      const result = await cleanupExpiredTelegramData()

      expect(result).toEqual({ sessions: 5, codes: 3 })
      expect(mockPrisma.telegramSession.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      })
      // Should delete both expired AND used codes
      expect(mockPrisma.telegramVerificationCode.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            { usedAt: { not: null } },
          ],
        },
      })
    })
  })
})
