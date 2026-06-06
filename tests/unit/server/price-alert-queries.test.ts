/**
 * Unit tests for price-alert-queries — query layer + Zod validation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Hoisted mocks ---
const {
  mockPriceAlertFindMany,
  mockPriceAlertFindUnique,
  mockPriceAlertCreate,
  mockPriceAlertUpdate,
  mockPriceAlertDelete,
} = vi.hoisted(() => ({
  mockPriceAlertFindMany: vi.fn(),
  mockPriceAlertFindUnique: vi.fn(),
  mockPriceAlertCreate: vi.fn(),
  mockPriceAlertUpdate: vi.fn(),
  mockPriceAlertDelete: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    priceAlert: {
      findMany: mockPriceAlertFindMany,
      findUnique: mockPriceAlertFindUnique,
      create: mockPriceAlertCreate,
      update: mockPriceAlertUpdate,
      delete: mockPriceAlertDelete,
    },
  },
}))

// --- Import SUT after mocks ---
import {
  listPriceAlerts,
  createPriceAlert,
  updatePriceAlert,
  deletePriceAlert,
  CreatePriceAlertSchema,
  UpdatePriceAlertSchema,
} from '~/server/utils/price-alert-queries'

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const USER_ID = 1n
const ALERT_ID = 42n

const mockAlert = {
  id: ALERT_ID,
  userId: USER_ID,
  symbol: 'AAPL',
  type: 'PRICE_ABOVE',
  threshold: { toString: () => '150.0000', valueOf: () => 150 },
  message: 'PRICE_ABOVE alert for AAPL at 150',
  isTriggered: false,
  triggeredAt: null,
  createdAt: new Date('2026-01-15T10:00:00Z'),
  updatedAt: new Date('2026-01-15T10:00:00Z'),
}

describe('price-alert-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── listPriceAlerts ───────────────────────────────────────────────────
  describe('listPriceAlerts', () => {
    it('calls prisma.priceAlert.findMany with correct where and orderBy', async () => {
      mockPriceAlertFindMany.mockResolvedValue([mockAlert])

      const result = await listPriceAlerts(USER_ID)

      expect(mockPriceAlertFindMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(ALERT_ID)
    })

    it('returns empty array when user has no alerts', async () => {
      mockPriceAlertFindMany.mockResolvedValue([])

      const result = await listPriceAlerts(USER_ID)

      expect(result).toEqual([])
    })
  })

  // ─── createPriceAlert ──────────────────────────────────────────────────
  describe('createPriceAlert', () => {
    it('creates alert with valid input', async () => {
      mockPriceAlertCreate.mockResolvedValue(mockAlert)

      const result = await createPriceAlert(USER_ID, {
        symbol: 'aapl',
        type: 'PRICE_ABOVE',
        threshold: 150,
      })

      expect(mockPriceAlertCreate).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          symbol: 'AAPL',
          type: 'PRICE_ABOVE',
          threshold: '150',
          message: 'PRICE_ABOVE alert for AAPL at 150',
        },
      })
      expect(result).toEqual(mockAlert)
    })

    it('uses custom message when provided', async () => {
      mockPriceAlertCreate.mockResolvedValue({
        ...mockAlert,
        message: 'Custom message',
      })

      await createPriceAlert(USER_ID, {
        symbol: 'TSLA',
        type: 'PRICE_BELOW',
        threshold: 200,
        message: 'Custom message',
      })

      expect(mockPriceAlertCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ message: 'Custom message' }),
        }),
      )
    })

    it('normalizes symbol to uppercase and trims whitespace', async () => {
      mockPriceAlertCreate.mockResolvedValue(mockAlert)

      await createPriceAlert(USER_ID, {
        symbol: '  msft  ',
        type: 'PRICE_ABOVE',
        threshold: 300,
      })

      expect(mockPriceAlertCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ symbol: 'MSFT' }),
        }),
      )
    })

    it('throws ZodError when symbol is missing', async () => {
      await expect(
        createPriceAlert(USER_ID, { type: 'PRICE_ABOVE', threshold: 100 }),
      ).rejects.toThrow()
    })

    it('throws ZodError when type is missing', async () => {
      await expect(
        createPriceAlert(USER_ID, { symbol: 'AAPL', threshold: 100 }),
      ).rejects.toThrow()
    })

    it('throws ZodError when threshold is missing', async () => {
      await expect(
        createPriceAlert(USER_ID, { symbol: 'AAPL', type: 'PRICE_ABOVE' }),
      ).rejects.toThrow()
    })

    it('throws ZodError for invalid alert type', async () => {
      await expect(
        createPriceAlert(USER_ID, { symbol: 'AAPL', type: 'INVALID_TYPE', threshold: 100 }),
      ).rejects.toThrow()
    })

    it('throws ZodError for unsupported alert type (CHANGE_PERCENT)', async () => {
      await expect(
        createPriceAlert(USER_ID, { symbol: 'AAPL', type: 'CHANGE_PERCENT', threshold: 5 }),
      ).rejects.toThrow()
    })

    it('throws ZodError for unsupported alert type (MOVING_AVG)', async () => {
      await expect(
        createPriceAlert(USER_ID, { symbol: 'AAPL', type: 'MOVING_AVG', threshold: 200 }),
      ).rejects.toThrow()
    })

    it('throws ZodError when symbol exceeds 20 characters', async () => {
      await expect(
        createPriceAlert(USER_ID, { symbol: 'A'.repeat(21), type: 'PRICE_ABOVE', threshold: 100 }),
      ).rejects.toThrow()
    })

    it('throws ZodError when symbol is empty after trim', async () => {
      await expect(
        createPriceAlert(USER_ID, { symbol: '   ', type: 'PRICE_ABOVE', threshold: 100 }),
      ).rejects.toThrow()
    })
  })

  // ─── updatePriceAlert ──────────────────────────────────────────────────
  describe('updatePriceAlert', () => {
    it('updates alert when owned by user', async () => {
      mockPriceAlertFindUnique.mockResolvedValue(mockAlert)
      mockPriceAlertUpdate.mockResolvedValue({
        ...mockAlert,
        threshold: { toString: () => '200.0000', valueOf: () => 200 },
      })

      const result = await updatePriceAlert(ALERT_ID, USER_ID, {
        threshold: 200,
      })

      expect(mockPriceAlertFindUnique).toHaveBeenCalledWith({
        where: { id: ALERT_ID },
      })
      expect(mockPriceAlertUpdate).toHaveBeenCalledWith({
        where: { id: ALERT_ID },
        data: { threshold: '200' },
      })
      expect(result.threshold.valueOf()).toBe(200)
    })

    it('updates message field', async () => {
      mockPriceAlertFindUnique.mockResolvedValue(mockAlert)
      mockPriceAlertUpdate.mockResolvedValue({
        ...mockAlert,
        message: 'New message',
      })

      await updatePriceAlert(ALERT_ID, USER_ID, {
        message: 'New message',
      })

      expect(mockPriceAlertUpdate).toHaveBeenCalledWith({
        where: { id: ALERT_ID },
        data: { message: 'New message' },
      })
    })

    it('updates isTriggered and triggeredAt', async () => {
      const triggeredDate = '2026-06-01T12:00:00Z'
      mockPriceAlertFindUnique.mockResolvedValue(mockAlert)
      mockPriceAlertUpdate.mockResolvedValue({
        ...mockAlert,
        isTriggered: true,
        triggeredAt: new Date(triggeredDate),
      })

      await updatePriceAlert(ALERT_ID, USER_ID, {
        isTriggered: true,
        triggeredAt: triggeredDate,
      })

      expect(mockPriceAlertUpdate).toHaveBeenCalledWith({
        where: { id: ALERT_ID },
        data: {
          isTriggered: true,
          triggeredAt: new Date(triggeredDate),
        },
      })
    })

    it('sets triggeredAt to null when null provided', async () => {
      mockPriceAlertFindUnique.mockResolvedValue({ ...mockAlert, isTriggered: true })
      mockPriceAlertUpdate.mockResolvedValue({
        ...mockAlert,
        triggeredAt: null,
      })

      await updatePriceAlert(ALERT_ID, USER_ID, {
        triggeredAt: null,
      })

      expect(mockPriceAlertUpdate).toHaveBeenCalledWith({
        where: { id: ALERT_ID },
        data: { triggeredAt: null },
      })
    })

    it('accepts string alertId and converts to BigInt', async () => {
      mockPriceAlertFindUnique.mockResolvedValue(mockAlert)
      mockPriceAlertUpdate.mockResolvedValue(mockAlert)

      await updatePriceAlert('42', USER_ID, { threshold: 200 })

      expect(mockPriceAlertFindUnique).toHaveBeenCalledWith({
        where: { id: 42n },
      })
    })

    it('throws notFound when alert does not exist', async () => {
      mockPriceAlertFindUnique.mockResolvedValue(null)

      await expect(
        updatePriceAlert(ALERT_ID, USER_ID, { threshold: 200 }),
      ).rejects.toThrow(`Price alert ${String(ALERT_ID)} not found`)
    })

    it('throws notFound when alert belongs to another user', async () => {
      mockPriceAlertFindUnique.mockResolvedValue({
        ...mockAlert,
        userId: 999n,
      })

      await expect(
        updatePriceAlert(ALERT_ID, USER_ID, { threshold: 200 }),
      ).rejects.toThrow(`Price alert ${String(ALERT_ID)} not found`)
    })

    it('does not call update when ownership check fails', async () => {
      mockPriceAlertFindUnique.mockResolvedValue(null)

      await expect(
        updatePriceAlert(ALERT_ID, USER_ID, { threshold: 200 }),
      ).rejects.toThrow()

      expect(mockPriceAlertUpdate).not.toHaveBeenCalled()
    })

    it('throws ZodError when no fields are provided', async () => {
      await expect(
        updatePriceAlert(ALERT_ID, USER_ID, {}),
      ).rejects.toThrow()
    })
  })

  // ─── deletePriceAlert ──────────────────────────────────────────────────
  describe('deletePriceAlert', () => {
    it('deletes alert when owned by user', async () => {
      mockPriceAlertFindUnique.mockResolvedValue(mockAlert)
      mockPriceAlertDelete.mockResolvedValue(mockAlert)

      await deletePriceAlert(ALERT_ID, USER_ID)

      expect(mockPriceAlertFindUnique).toHaveBeenCalledWith({
        where: { id: ALERT_ID },
      })
      expect(mockPriceAlertDelete).toHaveBeenCalledWith({
        where: { id: ALERT_ID },
      })
    })

    it('accepts string alertId and converts to BigInt', async () => {
      mockPriceAlertFindUnique.mockResolvedValue(mockAlert)
      mockPriceAlertDelete.mockResolvedValue(mockAlert)

      await deletePriceAlert('42', USER_ID)

      expect(mockPriceAlertFindUnique).toHaveBeenCalledWith({
        where: { id: 42n },
      })
      expect(mockPriceAlertDelete).toHaveBeenCalledWith({
        where: { id: 42n },
      })
    })

    it('throws notFound when alert does not exist', async () => {
      mockPriceAlertFindUnique.mockResolvedValue(null)

      await expect(
        deletePriceAlert(ALERT_ID, USER_ID),
      ).rejects.toThrow(`Price alert ${String(ALERT_ID)} not found`)
    })

    it('throws notFound when alert belongs to another user', async () => {
      mockPriceAlertFindUnique.mockResolvedValue({
        ...mockAlert,
        userId: 999n,
      })

      await expect(
        deletePriceAlert(ALERT_ID, USER_ID),
      ).rejects.toThrow(`Price alert ${String(ALERT_ID)} not found`)
    })

    it('does not call delete when ownership check fails', async () => {
      mockPriceAlertFindUnique.mockResolvedValue(null)

      await expect(
        deletePriceAlert(ALERT_ID, USER_ID),
      ).rejects.toThrow()

      expect(mockPriceAlertDelete).not.toHaveBeenCalled()
    })
  })

  // ─── Zod Schema unit tests ─────────────────────────────────────────────
  describe('CreatePriceAlertSchema', () => {
    it('accepts valid PRICE_ABOVE input', () => {
      const result = CreatePriceAlertSchema.parse({
        symbol: 'AAPL',
        type: 'PRICE_ABOVE',
        threshold: 150,
      })
      expect(result.symbol).toBe('AAPL')
      expect(result.type).toBe('PRICE_ABOVE')
    })

    it('accepts valid PRICE_BELOW input', () => {
      const result = CreatePriceAlertSchema.parse({
        symbol: 'TSLA',
        type: 'PRICE_BELOW',
        threshold: 200,
      })
      expect(result.type).toBe('PRICE_BELOW')
    })

    it('normalizes symbol to uppercase', () => {
      const result = CreatePriceAlertSchema.parse({
        symbol: 'aapl',
        type: 'PRICE_ABOVE',
        threshold: 150,
      })
      expect(result.symbol).toBe('AAPL')
    })

    it('trims whitespace from symbol', () => {
      const result = CreatePriceAlertSchema.parse({
        symbol: '  MSFT  ',
        type: 'PRICE_ABOVE',
        threshold: 300,
      })
      expect(result.symbol).toBe('MSFT')
    })

    it('rejects CHANGE_PERCENT as unsupported', () => {
      expect(() =>
        CreatePriceAlertSchema.parse({
          symbol: 'AAPL',
          type: 'CHANGE_PERCENT',
          threshold: 5,
        }),
      ).toThrow()
    })
  })

  describe('UpdatePriceAlertSchema', () => {
    it('accepts partial threshold update', () => {
      const result = UpdatePriceAlertSchema.parse({ threshold: 200 })
      expect(result.threshold).toBe(200)
    })

    it('accepts partial message update', () => {
      const result = UpdatePriceAlertSchema.parse({ message: 'New msg' })
      expect(result.message).toBe('New msg')
    })

    it('rejects empty object', () => {
      expect(() => UpdatePriceAlertSchema.parse({})).toThrow()
    })
  })
})
