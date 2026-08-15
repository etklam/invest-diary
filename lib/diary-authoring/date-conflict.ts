import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { isAuthSessionError } from '~/lib/auth/session-error'
import { createEmptyDiaryAuthoringForm, hydrateDiaryAuthoring } from './hydration'
import { createLatestLookupGate, type DiaryDraftGuard } from './draft-guard'
import type { DiaryAuthoringForm } from './types'

export interface DateLookupOptions {
  /** Initial mount preflight: the clean baseline means nothing to confirm. */
  initial?: boolean
  /** Retry after a transient failure: keep the draft even when the date is free. */
  preserveDraft?: boolean
}

export interface DiaryDateConflict {
  checkingDate: Ref<boolean>
  dateLookupError: Ref<boolean>
  pendingConflict: Ref<{ date: string; diary: Record<string, any> } | null>
  committedDate: Ref<string>
  /** Diary currently backing the form; null means the next save creates. */
  diaryId: Ref<string | null>
  isEditing: ComputedRef<boolean>
  appendToExisting: Ref<boolean>
  lookupDiaryForDate: (date: string, options?: DateLookupOptions) => Promise<void>
  resolveDateConflict: (choice: 'edit' | 'append' | 'cancel') => void
  retryDateLookup: () => void
  /** Replaces the whole form (e.g. hydration) without triggering a date lookup. */
  replaceForm: (nextForm: DiaryAuthoringForm) => void
}

export interface DiaryDateConflictOptions {
  form: DiaryAuthoringForm
  draftGuard: DiaryDraftGuard
  /** Resolves the Diary occupying a date, or null when the date is free. */
  fetchDiaryByDate: (date: string) => Promise<Record<string, any> | null | undefined>
  /** Reports a failed lookup, e.g. a toast with the resolved i18n message. */
  reportLookupError: (error: unknown) => void
  /** Timezone used when hydrating a conflicting Diary into the form. */
  timeZone?: () => string
  initialDiaryId?: string | null
  initialCommittedDate?: string
}

/**
 * Shared date-conflict controller for Diary authoring pages.
 *
 * Owns the by-date lookup state machine: race-guarded lookups, draft
 * preservation, conflict stashing, and error recovery. The page supplies the
 * reactive form, the draft guard, and the transport/toast adapters, so the
 * controller stays unit-testable without page mounting.
 */
export function useDiaryDateConflict(options: DiaryDateConflictOptions): DiaryDateConflict {
  const {
    form,
    draftGuard,
    fetchDiaryByDate,
    reportLookupError,
    timeZone,
  } = options

  const checkingDate = ref(false)
  const dateLookupError = ref(false)
  const pendingConflict = ref<{ date: string; diary: Record<string, any> } | null>(null)
  const diaryId = ref<string | null>(options.initialDiaryId ?? null)
  const appendToExisting = ref(false)
  const committedDate = ref(options.initialCommittedDate ?? '')
  const latestLookup = createLatestLookupGate()
  const ignoreDateWatchFor = ref<string | null>(null)

  const isEditing = computed(() => diaryId.value !== null)

  function replaceForm(nextForm: DiaryAuthoringForm) {
    ignoreDateWatchFor.value = nextForm.date
    Object.assign(form, nextForm)
  }

  function restoreCommittedDate() {
    ignoreDateWatchFor.value = committedDate.value
    form.date = committedDate.value
  }

  function resetToNewDiary(date: string) {
    replaceForm(createEmptyDiaryAuthoringForm(date))
    diaryId.value = null
    appendToExisting.value = false
  }

  async function lookupDiaryForDate(date: string, lookupOptions: DateLookupOptions = {}) {
    const token = latestLookup.begin()
    checkingDate.value = true
    dateLookupError.value = false

    try {
      const existingDiary = await fetchDiaryByDate(date)

      // Race guard: a slower response must never overwrite the state selected
      // by a newer date lookup.
      if (!latestLookup.isLatest(token)) return

      if (existingDiary) {
        pendingConflict.value = { date, diary: existingDiary }
        return
      }

      if (lookupOptions.preserveDraft) {
        // A retry that finds no Diary must not erase the draft the author kept
        // editing through the transient failure.
        return
      }

      if (!lookupOptions.initial && draftGuard.isContentDirty.value && !draftGuard.confirmDraftReplacement()) {
        restoreCommittedDate()
        return
      }

      resetToNewDiary(date)
      committedDate.value = date
      pendingConflict.value = null
      draftGuard.markClean()
    } catch (error) {
      if (isAuthSessionError(error)) return
      if (!latestLookup.isLatest(token)) return

      dateLookupError.value = true
      pendingConflict.value = null
      if (date !== committedDate.value) restoreCommittedDate()
      reportLookupError(error)
    } finally {
      if (latestLookup.isLatest(token)) checkingDate.value = false
    }
  }

  function resolveDateConflict(choice: 'edit' | 'append' | 'cancel') {
    const conflict = pendingConflict.value
    if (!conflict) return

    if (choice === 'cancel') {
      restoreCommittedDate()
      pendingConflict.value = null
      return
    }

    if (choice === 'edit') {
      replaceForm(hydrateDiaryAuthoring(conflict.diary, {
        timeZone: timeZone?.(),
        fallbackDate: conflict.date,
      }))
      diaryId.value = String(conflict.diary.id)
      appendToExisting.value = false
      committedDate.value = conflict.date
      pendingConflict.value = null
      dateLookupError.value = false
      draftGuard.markClean()
      return
    }

    // Append preserves the current draft and records the explicit intent for
    // the create API. The existing Diary is intentionally not hydrated.
    diaryId.value = null
    appendToExisting.value = true
    committedDate.value = conflict.date
    pendingConflict.value = null
    dateLookupError.value = false
  }

  function retryDateLookup() {
    void lookupDiaryForDate(committedDate.value, { preserveDraft: true })
  }

  watch(() => form.date, (newDate, oldDate) => {
    if (!newDate || newDate === oldDate) return
    if (ignoreDateWatchFor.value === newDate) {
      ignoreDateWatchFor.value = null
      return
    }

    void lookupDiaryForDate(newDate)
  })

  return {
    checkingDate,
    dateLookupError,
    pendingConflict,
    committedDate,
    diaryId,
    isEditing,
    appendToExisting,
    lookupDiaryForDate,
    resolveDateConflict,
    retryDateLookup,
    replaceForm,
  }
}
