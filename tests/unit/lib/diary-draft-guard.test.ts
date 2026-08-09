import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import {
  createDiaryDraftGuard,
  createLatestLookupGate,
  serializeDiaryDraft,
} from '~/lib/diary-authoring/draft-guard'
import type { DiaryAuthoringForm } from '~/lib/diary-authoring/types'

function createForm(overrides: Partial<DiaryAuthoringForm> = {}): DiaryAuthoringForm {
  return {
    date: '2026-08-07',
    title: '',
    content: '',
    thesis: '',
    risk: '',
    execution: '',
    reviewDueAt: '',
    transactions: [],
    alerts: [],
    ...overrides,
  }
}

describe('diary draft guard', () => {
  it('tracks the complete draft and resets the baseline after a successful save', () => {
    const form = reactive(createForm()) as unknown as DiaryAuthoringForm
    const guard = createDiaryDraftGuard(() => form, vi.fn(() => true))

    guard.markClean()
    expect(guard.isDirty.value).toBe(false)

    form.title = 'Market read'
    expect(guard.isDirty.value).toBe(true)
    expect(guard.confirmLeave()).toBe(true)

    guard.markClean()
    expect(guard.isDirty.value).toBe(false)
  })

  it('can distinguish content changes from a date-only change', () => {
    const form = reactive(createForm()) as unknown as DiaryAuthoringForm
    const guard = createDiaryDraftGuard(() => form, vi.fn(() => false))

    guard.markClean()
    form.date = '2026-08-08'

    expect(guard.isDirty.value).toBe(true)
    expect(guard.isContentDirty.value).toBe(false)
    expect(guard.confirmDraftReplacement()).toBe(true)

    form.content = 'Keep this draft'
    expect(guard.isContentDirty.value).toBe(true)
    expect(guard.confirmDraftReplacement()).toBe(false)
  })

  it('uses the same dirty policy for beforeunload', () => {
    const form = reactive(createForm()) as unknown as DiaryAuthoringForm
    const guard = createDiaryDraftGuard(() => form, vi.fn(() => true))
    guard.markClean()

    const cleanEvent = { preventDefault: vi.fn(), returnValue: '' } as unknown as BeforeUnloadEvent
    guard.handleBeforeUnload(cleanEvent)
    expect(cleanEvent.preventDefault).not.toHaveBeenCalled()

    form.content = 'Unsaved'
    const dirtyEvent = { preventDefault: vi.fn(), returnValue: '' } as unknown as BeforeUnloadEvent
    guard.handleBeforeUnload(dirtyEvent)
    expect(dirtyEvent.preventDefault).toHaveBeenCalledOnce()
    expect(dirtyEvent.returnValue).toBe('')
  })

  it('serializes nested authoring fields so edits cannot bypass dirty detection', () => {
    const form = reactive(createForm({
      transactions: [{
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 1,
        price: 100,
        trade_date: '2026-08-07T12:00',
      }],
      alerts: [{ message: 'Review', trigger_at: '2026-08-08', recurring_mode: '' }],
    })) as unknown as DiaryAuthoringForm

    const before = serializeDiaryDraft(form)
    form.transactions[0]!.quantity = 2
    const after = serializeDiaryDraft(form)

    expect(after).not.toBe(before)
  })
})

describe('latest diary date lookup gate', () => {
  it('accepts only the token for the latest lookup', () => {
    const gate = createLatestLookupGate()
    const first = gate.begin()
    const second = gate.begin()

    expect(gate.isLatest(first)).toBe(false)
    expect(gate.isLatest(second)).toBe(true)
  })

  it('invalidates an in-flight lookup when the page is done with it', () => {
    const gate = createLatestLookupGate()
    const token = gate.begin()
    gate.invalidate()

    expect(gate.isLatest(token)).toBe(false)
  })
})
