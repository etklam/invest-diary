import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { useDiaryDateConflict } from '~/lib/diary-authoring/date-conflict'
import { createDiaryDraftGuard } from '~/lib/diary-authoring/draft-guard'
import type { DiaryAuthoringForm } from '~/lib/diary-authoring/types'

function createForm(overrides: Partial<DiaryAuthoringForm> = {}): DiaryAuthoringForm {
  return {
    date: '2026-08-01',
    title: '',
    content: '',
    thesis: '',
    risk: '',
    execution: '',
    reviewDueAt: '',
    stockSymbols: [],
    transactions: [],
    alerts: [],
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

/** Drain the watcher queue and the pending lookup microtask chain. */
const flushAsync = () => new Promise<void>(resolve => setTimeout(resolve, 0))

const existingDiary = {
  id: 7,
  date: '2026-08-02T00:00:00.000Z',
  title: 'Existing entry',
  content: 'Old body',
  transactions: [],
  alerts: [],
}

function setup(overrides: {
  fetchDiaryByDate?: (date: string) => Promise<Record<string, any> | null | undefined>
  confirmLeave?: () => boolean
  initialDiaryId?: string | null
} = {}) {
  const form = reactive(createForm()) as unknown as DiaryAuthoringForm
  const draftGuard = createDiaryDraftGuard(() => form, overrides.confirmLeave ?? vi.fn(() => true))
  const fetchDiaryByDate = overrides.fetchDiaryByDate ?? vi.fn(async () => null)
  const reportLookupError = vi.fn()

  const conflict = useDiaryDateConflict({
    form,
    draftGuard,
    fetchDiaryByDate,
    reportLookupError,
    timeZone: () => 'UTC',
    initialDiaryId: overrides.initialDiaryId,
    initialCommittedDate: '2026-08-01',
  })

  return { conflict, form, draftGuard, fetchDiaryByDate, reportLookupError }
}

describe('useDiaryDateConflict', () => {
  it('treats an initial diary id as the editing baseline', () => {
    const { conflict } = setup({ initialDiaryId: '123' })

    expect(conflict.diaryId.value).toBe('123')
    expect(conflict.isEditing.value).toBe(true)
  })

  it('stashes an occupied date as a pending conflict without touching the form', async () => {
    const { conflict, form, fetchDiaryByDate } = setup({
      fetchDiaryByDate: vi.fn(async () => existingDiary),
    })
    form.title = 'My draft'

    form.date = '2026-08-02'
    await flushAsync()

    expect(fetchDiaryByDate).toHaveBeenCalledWith('2026-08-02')
    expect(conflict.pendingConflict.value).toEqual({ date: '2026-08-02', diary: existingDiary })
    expect(form.title).toBe('My draft')
    expect(conflict.isEditing.value).toBe(false)
    expect(conflict.checkingDate.value).toBe(false)
  })

  describe('race guard', () => {
    it('never lets a slower response overwrite a newer selection', async () => {
      const olderResponse = deferred<Record<string, any> | null>(null)
      const newerResponse = deferred<Record<string, any> | null>(null)
      const { conflict, fetchDiaryByDate } = setup({
        fetchDiaryByDate: vi.fn()
          .mockReturnValueOnce(olderResponse.promise)
          .mockReturnValueOnce(newerResponse.promise),
      })

      const olderLookup = conflict.lookupDiaryForDate('2026-08-01')
      const newerLookup = conflict.lookupDiaryForDate('2026-08-02')

      newerResponse.resolve(null)
      await newerLookup
      expect(conflict.committedDate.value).toBe('2026-08-02')
      expect(conflict.checkingDate.value).toBe(false)

      olderResponse.resolve({ id: 1, title: 'Stale diary' })
      await olderLookup
      await flushAsync()

      expect(conflict.pendingConflict.value).toBeNull()
      expect(conflict.committedDate.value).toBe('2026-08-02')
      expect(conflict.checkingDate.value).toBe(false)
      expect(fetchDiaryByDate).toHaveBeenCalledTimes(2)
    })

    it('discards a stale error from an older lookup', async () => {
      const olderResponse = deferred<Record<string, any> | null>(null)
      const newerResponse = deferred<Record<string, any> | null>(null)
      const { conflict, reportLookupError } = setup({
        fetchDiaryByDate: vi.fn()
          .mockReturnValueOnce(olderResponse.promise)
          .mockReturnValueOnce(newerResponse.promise),
      })

      const olderLookup = conflict.lookupDiaryForDate('2026-08-01')
      const newerLookup = conflict.lookupDiaryForDate('2026-08-02')

      newerResponse.resolve(null)
      await newerLookup

      olderResponse.reject(new Error('stale network failure'))
      await olderLookup
      await flushAsync()

      expect(conflict.dateLookupError.value).toBe(false)
      expect(reportLookupError).not.toHaveBeenCalled()
      expect(conflict.committedDate.value).toBe('2026-08-02')
    })
  })

  describe('draft preservation', () => {
    it('keeps a dirty draft and restores the committed date when replacement is declined', async () => {
      const { conflict, form, draftGuard, fetchDiaryByDate } = setup({
        confirmLeave: () => false,
      })
      draftGuard.markClean()
      form.title = 'Keep me'
      expect(draftGuard.isContentDirty.value).toBe(true)

      form.date = '2026-08-02'
      await flushAsync()

      expect(form.date).toBe('2026-08-01')
      expect(form.title).toBe('Keep me')
      expect(conflict.committedDate.value).toBe('2026-08-01')
      expect(conflict.diaryId.value).toBeNull()
      expect(fetchDiaryByDate).toHaveBeenCalledTimes(1)
    })

    it('does not erase the draft when a retry after failure finds the date free', async () => {
      const transientFailure = Object.assign(new Error('network down'), { statusCode: 503 })
      const { conflict, form, reportLookupError } = setup({
        fetchDiaryByDate: vi.fn()
          .mockRejectedValueOnce(transientFailure)
          .mockResolvedValueOnce(null),
      })

      form.date = '2026-08-02'
      await flushAsync()
      expect(conflict.dateLookupError.value).toBe(true)
      expect(reportLookupError).toHaveBeenCalledWith(transientFailure)

      form.title = 'Still here'
      conflict.retryDateLookup()
      await flushAsync()

      expect(form.title).toBe('Still here')
      expect(form.date).toBe('2026-08-01')
      expect(conflict.dateLookupError.value).toBe(false)
      expect(conflict.committedDate.value).toBe('2026-08-01')
    })

    it('skips the dirty confirmation for the initial mount preflight', async () => {
      const { conflict, form, draftGuard } = setup({
        confirmLeave: () => false,
      })
      draftGuard.markClean()
      form.title = 'Fresh draft'
      expect(draftGuard.isContentDirty.value).toBe(true)

      await conflict.lookupDiaryForDate('2026-08-02', { initial: true })

      expect(form.title).toBe('')
      expect(form.date).toBe('2026-08-02')
      expect(conflict.committedDate.value).toBe('2026-08-02')
      expect(conflict.pendingConflict.value).toBeNull()
    })
  })

  describe('resolveDateConflict', () => {
    async function stashConflict() {
      return setup({ fetchDiaryByDate: vi.fn(async () => existingDiary) })
    }

    it('cancel restores the committed date and clears the conflict', async () => {
      const { conflict, form, fetchDiaryByDate } = await stashConflict()

      form.date = '2026-08-02'
      await flushAsync()
      conflict.resolveDateConflict('cancel')
      await flushAsync()

      expect(conflict.pendingConflict.value).toBeNull()
      expect(form.date).toBe('2026-08-01')
      expect(fetchDiaryByDate).toHaveBeenCalledTimes(1)
    })

    it('edit hydrates the conflicting diary and switches to editing mode', async () => {
      const { conflict, form, draftGuard } = await stashConflict()

      form.date = '2026-08-02'
      await flushAsync()
      conflict.resolveDateConflict('edit')

      expect(form.title).toBe('Existing entry')
      expect(form.content).toBe('Old body')
      expect(conflict.diaryId.value).toBe('7')
      expect(conflict.isEditing.value).toBe(true)
      expect(conflict.appendToExisting.value).toBe(false)
      expect(conflict.committedDate.value).toBe('2026-08-02')
      expect(conflict.pendingConflict.value).toBeNull()
      expect(draftGuard.isDirty.value).toBe(false)
    })

    it('append keeps the draft and records the create intent', async () => {
      const { conflict, form } = await stashConflict()

      form.date = '2026-08-02'
      await flushAsync()
      form.title = 'My new words'
      conflict.resolveDateConflict('append')

      expect(form.title).toBe('My new words')
      expect(conflict.appendToExisting.value).toBe(true)
      expect(conflict.diaryId.value).toBeNull()
      expect(conflict.committedDate.value).toBe('2026-08-02')
      expect(conflict.pendingConflict.value).toBeNull()
    })
  })

  describe('error recovery', () => {
    it('restores the committed date and reports non-auth failures', async () => {
      const failure = Object.assign(new Error('server error'), { statusCode: 500 })
      const { conflict, form, reportLookupError } = setup({
        fetchDiaryByDate: vi.fn().mockRejectedValue(failure),
      })

      form.date = '2026-08-02'
      await flushAsync()

      expect(conflict.dateLookupError.value).toBe(true)
      expect(conflict.pendingConflict.value).toBeNull()
      expect(form.date).toBe('2026-08-01')
      expect(reportLookupError).toHaveBeenCalledWith(failure)
      expect(conflict.checkingDate.value).toBe(false)
    })

    it('stays quiet on auth session errors so the recovery flow can redirect', async () => {
      const authError = {
        statusCode: 401,
        data: { code: 'AUTH_TOKEN_EXPIRED' },
      }
      const { conflict, reportLookupError } = setup({
        fetchDiaryByDate: vi.fn().mockRejectedValue(authError),
      })

      await conflict.lookupDiaryForDate('2026-08-02')

      expect(conflict.dateLookupError.value).toBe(false)
      expect(reportLookupError).not.toHaveBeenCalled()
      expect(conflict.checkingDate.value).toBe(false)
    })
  })

  describe('form.date watch wiring', () => {
    it('replaces the form without triggering a date lookup', async () => {
      const { conflict, form, fetchDiaryByDate } = setup()

      conflict.replaceForm({ ...createForm(), date: '2026-08-09', title: 'Hydrated' })
      await flushAsync()

      expect(form.title).toBe('Hydrated')
      expect(form.date).toBe('2026-08-09')
      expect(fetchDiaryByDate).not.toHaveBeenCalled()
    })
  })
})
