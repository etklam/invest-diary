import { describe, expect, it } from 'vitest'
import {
  createEmptyDiaryAuthoringForm,
  hydrateDiaryAuthoring,
} from '~/lib/diary-authoring/hydration'
import { buildDiaryAuthoringPayload } from '~/lib/diary-authoring/payload'
import { toDateTimeLocalValue } from '~/lib/dates/normalize'
import {
  calculateLedgerHoldings,
  validateDiaryDraft,
  validateDiaryPayloadLimits,
} from '~/lib/diary-authoring/validation'

describe('validateDiaryPayloadLimits', () => {
  it('accepts payloads at the exact caps', () => {
    expect(validateDiaryPayloadLimits({
      title: 'x'.repeat(500),
      content: 'x'.repeat(500_000),
      transactions: Array.from({ length: 100 }, () => ({})),
      alerts: Array.from({ length: 50 }, () => ({})),
    })).toBeNull()
  })

  it('rejects one past each cap with the limit named in the message', () => {
    expect(validateDiaryPayloadLimits({ title: 'x'.repeat(501) })).toMatchObject({
      field: 'title',
      message: expect.stringContaining('500'),
    })
    expect(validateDiaryPayloadLimits({ content: 'x'.repeat(500_001) })).toMatchObject({
      field: 'content',
      message: expect.stringContaining('500000'),
    })
    expect(validateDiaryPayloadLimits({ transactions: Array.from({ length: 101 }, () => ({})) })).toMatchObject({
      field: 'transactions',
      message: expect.stringContaining('100'),
    })
    expect(validateDiaryPayloadLimits({ alerts: Array.from({ length: 51 }, () => ({})) })).toMatchObject({
      field: 'alerts',
      message: expect.stringContaining('50'),
    })
  })

  it('treats missing fields as empty (update payloads may omit them)', () => {
    expect(validateDiaryPayloadLimits({ title: 'Valid' })).toBeNull()
    expect(validateDiaryPayloadLimits({})).toBeNull()
  })
})

describe('diary authoring module', () => {
  it('hydrates API scalar wrappers and both API transaction naming conventions', () => {
    const form = hydrateDiaryAuthoring({
      date: '2026-05-18',
      title: '  Morning plan ',
      content: null,
      thesis: null,
      risk: 'risk',
      execution: 'scaled in',
      reviewDueAt: '2026-05-25T12:00:00.000Z',
      transactions: [{
        id: 42n,
        symbol: ' aapl ',
        type: 'BUY',
        quantity: { toNumber: () => 3.5 },
        price: '100.25',
        tradeDate: '2026-05-18T09:30:00.000Z',
      }],
      alerts: [{
        id: 7n,
        message: 'check',
        triggerAt: '2026-05-19T12:00:00.000Z',
        recurringMode: 'WEEK',
      }],
    }, { timeZone: 'UTC' })

    expect(form).toMatchObject({
      date: '2026-05-18',
      title: '  Morning plan ',
      content: '',
      thesis: '',
      risk: 'risk',
      execution: 'scaled in',
      reviewDueAt: '2026-05-25',
      transactions: [{
        id: '42',
        symbol: 'AAPL',
        quantity: 3.5,
        price: 100.25,
        trade_date: toDateTimeLocalValue(new Date('2026-05-18T09:30:00.000Z')),
      }],
      alerts: [{
        id: '7',
        trigger_at: '2026-05-19',
        recurring_mode: 'WEEK',
      }],
    })
  })

  it('builds a stable API payload from the normalized form', () => {
    const form = createEmptyDiaryAuthoringForm('2026-05-18')
    form.title = 'Plan'
    form.content = 'Content'
    form.execution = 'Followed the plan'
    form.reviewDueAt = '2026-05-25'
    form.transactions.push({
      symbol: ' aapl ',
      type: 'BUY',
      quantity: 2,
      price: 101,
      trade_date: '2026-05-18T09:30:00.000Z',
    })
    form.alerts.push({
      message: 'Review',
      trigger_at: '2026-05-19',
      recurring_mode: 'MONTH',
    })

    expect(buildDiaryAuthoringPayload(form)).toEqual({
      title: 'Plan',
      content: 'Content',
      thesis: undefined,
      risk: undefined,
      execution: 'Followed the plan',
      reviewDueAt: '2026-05-25T12:00:00.000Z',
      stockSymbols: [],
      date: '2026-05-18',
      transactions: [{
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 2,
        price: 101,
        tradeDate: '2026-05-18T09:30:00.000Z',
      }],
      alerts: [{
        message: 'Review',
        triggerAt: '2026-05-19T12:00:00.000Z',
        recurringMode: 'MONTH',
      }],
    })
  })

  it('enforces the oversell rule in the server-authoritative ledger walk', () => {
    // The BUY/SELL walk lives in calculateLedgerHoldings, invoked server-side
    // by validateDiaryTransactionsForUser — the single oversell authority.
    expect(() => calculateLedgerHoldings({}, [
      { symbol: 'AAPL', type: 'SELL', quantity: 100, price: 10 },
    ])).toThrow()

    expect(() => calculateLedgerHoldings({}, [
      { symbol: 'AAPL', type: 'BUY', quantity: 10, price: 10 },
      { symbol: 'AAPL', type: 'SELL', quantity: 4, price: 12 },
    ])).not.toThrow()
  })

  it('validates a draft without any ledger context (client has none)', () => {
    expect(validateDiaryDraft([
      { symbol: 'AAPL', type: 'SELL', quantity: 4 },
    ])).toBeNull()
  })
})
