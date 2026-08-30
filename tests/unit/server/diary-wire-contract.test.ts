import { Prisma } from '@prisma/client'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { serialize, type Serialized } from '~/server/utils/serialize'
import type { DiaryResponse } from '~/lib/contracts/diary'

type RepresentativePrismaDiary = {
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
  tags: string[]
  stockSymbols: string[]
  stockContexts: Array<{ stock: { symbol: string } }>
  transactions: Array<{
    id: bigint
    diaryId: bigint
    userId: bigint
    symbol: string
    type: 'BUY' | 'SELL'
    quantity: Prisma.Decimal
    price: Prisma.Decimal
    tradeDate: Date
    notes: string | null
    strategy: string | null
    emotion: string | null
    createdAt: Date
  }>
  alerts: Array<{
    id: bigint
    diaryId: bigint
    message: string
    triggerAt: Date
    isDismissed: boolean
    recurringMode: 'WEEK' | 'MONTH' | null
    parentId: bigint | null
    instanceNumber: number | null
    isPaused: boolean
    createdAt: Date
  }>
}

function expectJsonPrimitives(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(expectJsonPrimitives)
    return
  }

  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(expectJsonPrimitives)
    return
  }

  expect(['string', 'number', 'boolean'].includes(typeof value) || value === null).toBe(true)
}

describe('Diary wire contract', () => {
  it('matches the serialized Prisma shape and contains only JSON primitives', () => {
    expectTypeOf<Serialized<RepresentativePrismaDiary>>().toMatchTypeOf<DiaryResponse>()

    const timestamp = new Date('2026-08-30T12:00:00.000Z')
    const rawDiary: RepresentativePrismaDiary = {
      id: 42n,
      userId: 7n,
      title: 'A diary',
      content: 'A decision',
      tagsString: 'profit',
      createdVia: 'WEB',
      createdByLabel: null,
      date: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      thesis: null,
      risk: 'Defined risk',
      execution: null,
      reviewDueAt: null,
      reviewStatus: 'none',
      reviewedAt: null,
      reviewOutcome: null,
      reviewSummary: null,
      reviewLearning: null,
      reviewAdjustment: null,
      tags: ['profit'],
      stockSymbols: ['AAPL'],
      stockContexts: [{ stock: { symbol: 'AAPL' } }],
      transactions: [{
        id: 100n,
        diaryId: 42n,
        userId: 7n,
        symbol: 'AAPL',
        type: 'BUY',
        quantity: new Prisma.Decimal('2.5'),
        price: new Prisma.Decimal('180.25'),
        tradeDate: timestamp,
        notes: null,
        strategy: 'breakout',
        emotion: null,
        createdAt: timestamp,
      }],
      alerts: [{
        id: 200n,
        diaryId: 42n,
        message: 'Review earnings',
        triggerAt: timestamp,
        isDismissed: false,
        recurringMode: null,
        parentId: null,
        instanceNumber: null,
        isPaused: false,
        createdAt: timestamp,
      }],
    }

    const wire = JSON.parse(JSON.stringify(serialize(rawDiary))) as DiaryResponse

    expect(wire).toEqual({
      id: '42',
      userId: '7',
      title: 'A diary',
      content: 'A decision',
      tagsString: 'profit',
      createdVia: 'WEB',
      createdByLabel: null,
      date: '2026-08-30T12:00:00.000Z',
      createdAt: '2026-08-30T12:00:00.000Z',
      updatedAt: '2026-08-30T12:00:00.000Z',
      thesis: null,
      risk: 'Defined risk',
      execution: null,
      reviewDueAt: null,
      reviewStatus: 'none',
      reviewedAt: null,
      reviewOutcome: null,
      reviewSummary: null,
      reviewLearning: null,
      reviewAdjustment: null,
      tags: ['profit'],
      stockSymbols: ['AAPL'],
      stockContexts: [{ stock: { symbol: 'AAPL' } }],
      transactions: [{
        id: '100',
        diaryId: '42',
        userId: '7',
        symbol: 'AAPL',
        type: 'BUY',
        quantity: '2.5',
        price: '180.25',
        tradeDate: '2026-08-30T12:00:00.000Z',
        notes: null,
        strategy: 'breakout',
        emotion: null,
        createdAt: '2026-08-30T12:00:00.000Z',
      }],
      alerts: [{
        id: '200',
        diaryId: '42',
        message: 'Review earnings',
        triggerAt: '2026-08-30T12:00:00.000Z',
        isDismissed: false,
        recurringMode: null,
        parentId: null,
        instanceNumber: null,
        isPaused: false,
        createdAt: '2026-08-30T12:00:00.000Z',
      }],
    })
    expectJsonPrimitives(wire)
  })
})
