import { describe, expect, it } from 'vitest'
import {
  createEmptyDiaryAuthoringForm,
  hydrateDiaryAuthoring,
} from '~/lib/diary-authoring/hydration'
import { buildDiaryAuthoringPayload } from '~/lib/diary-authoring/payload'
import { toDateTimeLocalValue } from '~/lib/dates/normalize'
import {
  validateDiaryDraft,
  validateTransactionLedger,
} from '~/lib/diary-authoring/validation'

describe('diary authoring module', () => {
  it('hydrates API scalar wrappers and both API transaction naming conventions', () => {
    const form = hydrateDiaryAuthoring({
      date: '2026-05-18T12:00:00.000Z',
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
      date: '2026-05-18T12:00:00.000Z',
      transactions: [{
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 2,
        price: 101,
        trade_date: '2026-05-18T09:30:00.000Z',
      }],
      alerts: [{
        message: 'Review',
        trigger_at: '2026-05-19T12:00:00.000Z',
        recurring_mode: 'MONTH',
      }],
    })
  })

  it('uses prior holdings when validating a later diary draft', () => {
    expect(validateDiaryDraft([
      { symbol: 'AAPL', type: 'SELL', quantity: 4 },
    ], { available: true, holdings: { AAPL: 10 } })).toBeNull()

    expect(validateDiaryDraft([
      { symbol: 'AAPL', type: 'SELL', quantity: 4 },
    ], { available: false })).toBeNull()

    expect(validateTransactionLedger({}, [
      { symbol: 'AAPL', type: 'SELL', quantity: 4 },
    ])).toMatchObject({ index: 0, symbol: 'AAPL' })
  })
})
