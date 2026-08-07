import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import type { DiaryAuthoringForm } from './types'

export const DIARY_UNSAVED_CHANGES_MESSAGE = '此日記有尚未儲存的變更，確定要離開嗎？'

export interface DiaryDraftSnapshotOptions {
  includeDate?: boolean
}

/**
 * Serialize only authoring fields in a stable shape. This is deliberately
 * independent from the API payload so a dirty check cannot hide edits during
 * hydration or payload normalization.
 */
export function serializeDiaryDraft(
  form: DiaryAuthoringForm,
  options: DiaryDraftSnapshotOptions = {},
): string {
  const includeDate = options.includeDate ?? true

  return JSON.stringify({
    ...(includeDate ? { date: form.date } : {}),
    title: form.title,
    content: form.content,
    thesis: form.thesis,
    risk: form.risk,
    transactions: form.transactions.map(transaction => ({
      id: transaction.id ?? null,
      symbol: transaction.symbol,
      type: transaction.type,
      quantity: transaction.quantity,
      price: transaction.price,
      trade_date: transaction.trade_date,
      notes: transaction.notes ?? null,
      strategy: transaction.strategy ?? null,
      emotion: transaction.emotion ?? null,
    })),
    alerts: form.alerts.map(alert => ({
      id: alert.id ?? null,
      message: alert.message,
      trigger_at: alert.trigger_at,
      recurring_mode: alert.recurring_mode ?? '',
    })),
  })
}

export interface LatestLookupGate {
  begin: () => number
  isLatest: (token: number) => boolean
  invalidate: () => void
}

/** Ensure an out-of-order response cannot update authoring state. */
export function createLatestLookupGate(): LatestLookupGate {
  let latestToken = 0

  return {
    begin() {
      latestToken += 1
      return latestToken
    },
    isLatest(token) {
      return token === latestToken
    },
    invalidate() {
      latestToken += 1
    },
  }
}

export interface DiaryDraftGuard {
  isDirty: ComputedRef<boolean>
  isContentDirty: ComputedRef<boolean>
  markClean: () => void
  confirmLeave: () => boolean
  confirmDraftReplacement: () => boolean
  allowNextRouteLeave: () => void
  routeLeaveGuard: () => boolean
  handleBeforeUnload: (event: BeforeUnloadEvent) => void
}

type ConfirmLeave = () => boolean

function defaultConfirmLeave(): boolean {
  if (typeof globalThis.confirm !== 'function') return true
  return globalThis.confirm(DIARY_UNSAVED_CHANGES_MESSAGE)
}

/**
 * Shared dirty-state policy for Diary authoring pages.
 *
 * `isDirty` includes the selected date because changing the target is an
 * unsaved authoring change. Date conflict resolution can use
 * `isContentDirty` so a date-only selection does not trigger a discard prompt
 * before the lookup has established the target's state.
 */
export function createDiaryDraftGuard(
  readForm: () => DiaryAuthoringForm,
  confirmLeave: ConfirmLeave = defaultConfirmLeave,
): DiaryDraftGuard {
  const baseline = ref<{ all: string; content: string } | null>(null)

  const isDirty = computed(() => {
    const currentBaseline = baseline.value
    if (!currentBaseline) return false
    return serializeDiaryDraft(readForm()) !== currentBaseline.all
  })

  const isContentDirty = computed(() => {
    const currentBaseline = baseline.value
    if (!currentBaseline) return false
    return serializeDiaryDraft(readForm(), { includeDate: false }) !== currentBaseline.content
  })

  function markClean() {
    const form = readForm()
    baseline.value = {
      all: serializeDiaryDraft(form),
      content: serializeDiaryDraft(form, { includeDate: false }),
    }
  }

  function confirmIfDirty(dirty: boolean): boolean {
    return !dirty || confirmLeave()
  }

  function confirmLeaveRequest(): boolean {
    return confirmIfDirty(isDirty.value)
  }

  function confirmDraftReplacement(): boolean {
    return confirmIfDirty(isContentDirty.value)
  }

  let allowNextNavigation = false

  function allowNextRouteLeave() {
    allowNextNavigation = true
  }

  function routeLeaveGuard(): boolean {
    if (allowNextNavigation) {
      allowNextNavigation = false
      return true
    }
    return confirmLeaveRequest()
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!isDirty.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  return {
    isDirty,
    isContentDirty,
    markClean,
    confirmLeave: confirmLeaveRequest,
    confirmDraftReplacement,
    allowNextRouteLeave,
    routeLeaveGuard,
    handleBeforeUnload,
  }
}

/** Register the shared route and browser leave hooks inside a page setup. */
export function useDiaryDraftGuard(
  readForm: () => DiaryAuthoringForm,
  confirmLeave: ConfirmLeave = defaultConfirmLeave,
): DiaryDraftGuard {
  const guard = createDiaryDraftGuard(readForm, confirmLeave)

  onBeforeRouteLeave(() => guard.routeLeaveGuard())

  onMounted(() => {
    window.addEventListener('beforeunload', guard.handleBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', guard.handleBeforeUnload)
  })

  return guard
}
