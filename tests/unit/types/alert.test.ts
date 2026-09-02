import { describe, expect, it } from 'vitest'
import { normalizeAlert } from '~/types/alert'

describe('alert canonical model', () => {
  it('normalizes WebSocket payloads to the shared AlertItem shape', () => {
    expect(normalizeAlert({
      id: '42',
      message: 'Review trades',
      triggerAt: new Date('2026-07-14T09:00:00Z'),
      diary: { id: '7', title: 'Morning notes' },
    })).toEqual({
      id: '42',
      message: 'Review trades',
      triggerAt: '2026-07-14T09:00:00.000Z',
      isDismissed: false,
      recurringMode: null,
      instanceNumber: undefined,
      createdAt: undefined,
      diary: { id: '7', title: 'Morning notes' },
    })
  })

  it('keeps legacy snake_case translation at the boundary only', () => {
    expect(normalizeAlert({
      id: '43',
      message: 'Legacy alert',
      trigger_at: '2026-07-14T10:00:00.000Z',
      is_dismissed: true,
      recurring_mode: 'WEEK',
      instance_number: 2,
      created_at: '2026-07-13T10:00:00.000Z',
    })).toMatchObject({
      id: '43',
      triggerAt: '2026-07-14T10:00:00.000Z',
      isDismissed: true,
      recurringMode: 'WEEK',
      instanceNumber: 2,
      createdAt: '2026-07-13T10:00:00.000Z',
    })
  })
})
