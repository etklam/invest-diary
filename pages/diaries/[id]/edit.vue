<template>
  <div v-if="pending" class="mx-auto flex max-w-4xl flex-col items-center justify-center gap-3 py-16 text-dt-text-muted">
    <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-dt-primary" />
    <p>{{ t('common.loading') }}</p>
  </div>

  <ErrorState
    v-else-if="error"
    :title="t('diary.loadFailed')"
    :message="error.message"
    :retry-fn="refresh"
  />

  <div v-else class="mx-auto max-w-4xl space-y-6">
    <!-- Header: 標題 + 日期（日記的身分欄位，放第一視線） -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-display text-2xl font-semibold tracking-tight text-dt-text">
        {{ t('diary.editDiary') }}
      </h1>
      <label class="flex items-center gap-2">
        <span class="text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.diaryDate') }}</span>
        <Icon v-if="checkingDate" name="svg-spinners:180-ring-with-bg" class="h-4 w-4 text-dt-primary" />
        <input
          type="date"
          id="diary-date"
          v-model="form.date"
          :disabled="Boolean(pendingConflict)"
          :class="inputClass"
          class="w-auto font-mono"
        />
      </label>
    </div>

    <div
      v-if="pendingConflict"
      role="dialog"
      aria-modal="true"
      data-testid="diary-date-conflict"
      class="space-y-4 rounded-dt-md border border-dt-warning/40 bg-dt-warning/10 px-5 py-4"
    >
      <div>
        <h2 class="font-display text-lg font-semibold text-dt-text">{{ t('quickDiary.errors.diaryExists') }}</h2>
        <p class="mt-1 text-sm text-dt-text-muted">{{ t('diary.form.existingLoaded') }}</p>
      </div>
      <div class="flex flex-wrap justify-end gap-3">
        <BaseButton type="button" @click="resolveDateConflict('edit')">
          {{ t('common.edit') }}
        </BaseButton>
        <BaseButton type="button" variant="secondary" @click="resolveDateConflict('append')">
          {{ t('quickDiary.appendDiary') }}
        </BaseButton>
        <BaseButton type="button" variant="ghost" @click="resolveDateConflict('cancel')">
          {{ t('common.cancel') }}
        </BaseButton>
      </div>
    </div>

    <div
      v-if="dateLookupError"
      role="alert"
      data-testid="diary-date-lookup-error"
      class="flex flex-wrap items-center justify-between gap-3 rounded-dt-sm border border-dt-danger/40 bg-dt-danger/10 px-4 py-3 text-sm text-dt-text"
    >
      <span>{{ t('diary.form.checkExistingFailed') }}</span>
      <BaseButton type="button" variant="secondary" @click="retryDateLookup">
        {{ t('common.retry') }}
      </BaseButton>
    </div>

    <form v-if="!pendingConflict" @submit.prevent="saveDiary" class="space-y-6">
      <LedgerCard>
        <DiaryEditor
          v-model:title="form.title"
          v-model:content="form.content"
          v-model:stock-symbols="form.stockSymbols"
        />
      </LedgerCard>

      <!-- Original decision context -->
      <LedgerCard>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
              {{ t('review.fields.thesis') }}
            </label>
            <textarea
              v-model="form.thesis"
              :placeholder="t('review.fields.thesisPlaceholder')"
              class="mt-1 w-full rounded-dt-sm border border-dt-border bg-dt-surface p-3 text-sm text-dt-text focus:border-dt-primary focus:outline-none"
              rows="3"
            />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
              {{ t('review.fields.risk') }}
            </label>
            <textarea
              v-model="form.risk"
              :placeholder="t('review.fields.riskPlaceholder')"
              class="mt-1 w-full rounded-dt-sm border border-dt-border bg-dt-surface p-3 text-sm text-dt-text focus:border-dt-primary focus:outline-none"
              rows="3"
            />
          </div>
          <div>
            <label for="diary-execution" class="text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
              {{ t('review.fields.execution') }}
            </label>
            <textarea
              id="diary-execution"
              v-model="form.execution"
              :placeholder="t('review.fields.executionPlaceholder')"
              class="mt-1 w-full rounded-dt-sm border border-dt-border bg-dt-surface p-3 text-sm text-dt-text focus:border-dt-primary focus:outline-none"
              rows="3"
            />
          </div>
          <div>
            <label for="diary-review-due" class="text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
              {{ t('review.fields.reviewDue') }}
            </label>
            <input
              id="diary-review-due"
              v-model="form.reviewDueAt"
              type="date"
              class="mt-1 w-full rounded-dt-sm border border-dt-border bg-dt-surface p-3 font-data text-sm text-dt-text focus:border-dt-primary focus:outline-none"
            />
          </div>
        </div>
      </LedgerCard>

      <!-- 交易記錄（摺疊，有資料自動展開） -->
      <section class="rounded-dt-md border border-dt-border bg-dt-surface shadow-dt-sm">
        <button
          type="button"
          @click="showTransactions = !showTransactions"
          class="flex min-h-11 w-full items-center justify-between px-5 py-4 text-left sm:px-6"
          :aria-expanded="showTransactions"
        >
          <span class="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-dt-text">
            {{ t('diary.form.transactions') }}
            <span
              v-if="form.transactions.length"
              class="rounded-dt-pill bg-dt-surface-strong px-2 py-0.5 font-mono text-xs text-dt-text-muted"
            >{{ form.transactions.length }}</span>
          </span>
          <Icon
            :name="showTransactions ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
            class="h-5 w-5 text-dt-text-muted"
          />
        </button>
        <div v-show="showTransactions" class="border-t border-dt-border px-5 py-4 sm:px-6">
          <TransactionInput v-model="form.transactions" />
        </div>
      </section>

      <!-- 提醒設定（摺疊，有資料自動展開） -->
      <section class="rounded-dt-md border border-dt-border bg-dt-surface shadow-dt-sm">
        <button
          type="button"
          @click="showAlerts = !showAlerts"
          class="flex min-h-11 w-full items-center justify-between px-5 py-4 text-left sm:px-6"
          :aria-expanded="showAlerts"
        >
          <span class="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-dt-text">
            {{ t('diary.form.alerts') }}
            <span
              v-if="form.alerts.length"
              class="rounded-dt-pill bg-dt-surface-strong px-2 py-0.5 font-mono text-xs text-dt-text-muted"
            >{{ form.alerts.length }}</span>
          </span>
          <Icon
            :name="showAlerts ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
            class="h-5 w-5 text-dt-text-muted"
          />
        </button>
        <div v-show="showAlerts" class="space-y-4 border-t border-dt-border px-5 py-4 sm:px-6">
          <div v-if="form.alerts.length === 0" class="rounded-dt-sm border border-dashed border-dt-border bg-dt-surface-strong py-8 text-center">
            <p class="text-sm text-dt-text-muted">{{ t('diary.form.noAlerts') }}</p>
            <BaseButton variant="secondary" class="mt-3" @click="addAlert">
              <Icon name="heroicons:plus" class="h-4 w-4" />
              {{ t('diary.form.addAlert') }}
            </BaseButton>
          </div>

          <template v-else>
            <div
              v-for="(alert, index) in form.alerts"
              :key="index"
              class="relative rounded-dt-sm border border-dt-border bg-dt-surface-strong p-4"
            >
              <button
                type="button"
                @click="removeAlert(index)"
                class="absolute right-1 top-1 flex min-h-[44px] min-w-[44px] items-center justify-center text-dt-text-soft transition-colors hover:text-dt-danger"
                :aria-label="t('common.delete')"
              >
                <Icon name="heroicons:x-mark" class="h-5 w-5" />
              </button>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label :for="`alert-msg-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.alertMessage') }}</label>
                  <input
                    type="text"
                    :id="`alert-msg-${index}`"
                    v-model="alert.message"
                    :class="inputClass"
                    :placeholder="t('diary.form.alertMessagePlaceholder')"
                  />
                </div>
                <div>
                  <label :for="`alert-time-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.alertDate') }}</label>
                  <input
                    type="date"
                    :id="`alert-time-${index}`"
                    v-model="alert.trigger_at"
                    :class="inputClass"
                    class="font-mono"
                  />
                </div>
                <div>
                  <label :for="`alert-recurring-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.alertRecurring') }}</label>
                  <select
                    :id="`alert-recurring-${index}`"
                    v-model="alert.recurring_mode"
                    :class="inputClass"
                  >
                    <option value="">{{ t('diary.form.recurringNone') }}</option>
                    <option value="WEEK">{{ t('diary.form.recurringWeek') }}</option>
                    <option value="MONTH">{{ t('diary.form.recurringMonth') }}</option>
                  </select>
                  <p class="mt-1 text-xs text-dt-text-soft">
                    {{ getRecurringDescription(alert.recurring_mode) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="flex justify-end">
              <BaseButton variant="secondary" @click="addAlert">
                <Icon name="heroicons:plus" class="h-4 w-4" />
                {{ t('diary.form.addAlert') }}
              </BaseButton>
            </div>
          </template>
        </div>
      </section>

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <NuxtLink
          :to="`/diaries/${currentDiaryId || routeId}`"
          @click.prevent="cancelEditing"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-dt-sm border border-dt-border bg-dt-surface px-4 py-2 text-sm font-semibold text-dt-text transition-colors duration-150 hover:bg-dt-surface-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30"
        >
          {{ t('common.cancel') }}
        </NuxtLink>
        <BaseButton type="submit" :disabled="saving">
          <Icon v-if="saving" name="svg-spinners:180-ring-with-bg" class="h-4 w-4" />
          {{ t('common.save') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthRecovery } from '~/composables/useAuthRecovery'
import { showDisciplineToast } from '~/composables/useDiscipline'
import { isAuthSessionError } from '~/lib/auth/session-error'
import {
  createEmptyDiaryAuthoringForm,
  hydrateDiaryAuthoring,
} from '~/lib/diary-authoring/hydration'
import { buildDiaryAuthoringPayload } from '~/lib/diary-authoring/payload'
import type { DiaryAuthoringForm } from '~/lib/diary-authoring/types'
import { validateDiaryDraft } from '~/lib/diary-authoring/validation'
import { resolveErrorMessage } from '~/composables/useErrorI18n'
import {
  createLatestLookupGate,
  useDiaryDraftGuard,
} from '~/lib/diary-authoring/draft-guard'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const routeId = String(route.params.id)
const saving = ref(false)
const toast = useToast()
const { t } = useI18n()
const { runWithAuthRecovery } = useAuthRecovery()
const { getTodayDateString, getTimezone } = useTimezone()
const checkingDate = ref(false)
const dateLookupError = ref(false)
const pendingConflict = ref<{ date: string; diary: Record<string, any> } | null>(null)
const appendToExisting = ref(false)
const currentDiaryId = ref<string | null>(routeId)
const committedDate = ref(getTodayDateString())
const latestDateLookup = createLatestLookupGate()
const ignoreDateWatchFor = ref<string | null>(null)

const inputClass = 'mt-1 block w-full min-h-[44px] rounded-dt-sm border border-dt-border bg-dt-surface px-3 text-sm text-dt-text focus:border-dt-primary focus:outline-none disabled:opacity-50'

// Fetch disciplines for trade discipline checking
// Use lazy fetch to avoid calling API during SSR before auth check
const { data: diary, pending, error, refresh } = await useLazyFetch<any>(`/api/diaries/${routeId}`)

const form = reactive<DiaryAuthoringForm>(createEmptyDiaryAuthoringForm(getTodayDateString()))
const draftGuard = useDiaryDraftGuard(() => form)

// Progressive disclosure：進階區塊預設收合，有資料時自動展開
const showTransactions = ref(form.transactions.length > 0)
const showAlerts = ref(form.alerts.length > 0)
watch(() => form.transactions.length, (n) => { if (n > 0) showTransactions.value = true })
watch(() => form.alerts.length, (n) => { if (n > 0) showAlerts.value = true })

watch(diary, (newDiary) => {
  if (newDiary) {
    const hydrated = hydrateDiaryAuthoring(newDiary, {
      timeZone: getTimezone(),
      fallbackDate: getTodayDateString(),
    })
    ignoreDateWatchFor.value = hydrated.date
    Object.assign(form, hydrated)
    currentDiaryId.value = String(newDiary.id ?? routeId)
    committedDate.value = hydrated.date
    appendToExisting.value = false
    pendingConflict.value = null
    dateLookupError.value = false
    draftGuard.markClean()
  }
}, { immediate: true })

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
  currentDiaryId.value = null
  appendToExisting.value = false
}

interface DateLookupOptions {
  preserveDraft?: boolean
}

async function lookupDiaryForDate(date: string, options: DateLookupOptions = {}) {
  const token = latestDateLookup.begin()
  checkingDate.value = true
  dateLookupError.value = false

  try {
    const existingDiary = await runWithAuthRecovery(() => $fetch<any>(
      `/api/diaries/by-date?date=${encodeURIComponent(date)}`
    ))

    // Ignore a response that belongs to an older date selection.
    if (!latestDateLookup.isLatest(token)) return

    if (existingDiary) {
      pendingConflict.value = { date, diary: existingDiary }
      return
    }

    if (options.preserveDraft) {
      // A retry that finds no Diary must not erase the draft retained after a
      // transient lookup failure.
      return
    }

    if (draftGuard.isContentDirty.value && !draftGuard.confirmDraftReplacement()) {
      restoreCommittedDate()
      return
    }

    resetToNewDiary(date)
    committedDate.value = date
    pendingConflict.value = null
    draftGuard.markClean()
  } catch (lookupError: any) {
    if (isAuthSessionError(lookupError)) return
    if (!latestDateLookup.isLatest(token)) return

    dateLookupError.value = true
    pendingConflict.value = null
    if (date !== committedDate.value) restoreCommittedDate()
    toast.error(resolveErrorMessage(lookupError, t, t('diary.form.checkExistingFailed')))
  } finally {
    if (latestDateLookup.isLatest(token)) checkingDate.value = false
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
      timeZone: getTimezone(),
      fallbackDate: conflict.date,
    }))
    currentDiaryId.value = String(conflict.diary.id)
    appendToExisting.value = false
    committedDate.value = conflict.date
    pendingConflict.value = null
    dateLookupError.value = false
    draftGuard.markClean()
    return
  }

  // Append keeps the current form and makes the POST intent explicit. It does
  // not hydrate the existing Diary into the current draft.
  currentDiaryId.value = null
  appendToExisting.value = true
  committedDate.value = conflict.date
  pendingConflict.value = null
  dateLookupError.value = false
}

watch(() => form.date, (newDate, oldDate) => {
  if (!newDate || newDate === oldDate) return
  if (ignoreDateWatchFor.value === newDate) {
    ignoreDateWatchFor.value = null
    return
  }

  void lookupDiaryForDate(newDate)
})

const retryDateLookup = () => {
  void lookupDiaryForDate(committedDate.value, { preserveDraft: true })
}

const cancelEditing = () => {
  if (!draftGuard.confirmLeave()) return
  draftGuard.allowNextRouteLeave()
  void router.push(`/diaries/${currentDiaryId.value || routeId}`)
}

const addAlert = () => {
  const today = getTodayDateString()

  form.alerts.push({
    message: '',
    trigger_at: today,
    recurring_mode: ''
  })
}

const getRecurringDescription = (mode?: string) => {
  if (mode === 'WEEK') return t('diary.form.recurringWeekDesc')
  if (mode === 'MONTH') return t('diary.form.recurringMonthDesc')
  return t('diary.form.recurringOnceDesc')
}

const removeAlert = (index: number) => {
  form.alerts.splice(index, 1)
}

const saveDiary = async () => {
  if (!form.title) {
    toast.error(t('diary.titleRequired'))
    return
  }

  // The server owns the portfolio baseline. Without a fetched baseline the
  // client must not mistake this diary's draft for the whole portfolio.
  const validationError = validateDiaryDraft(form.transactions, { available: false })
  if (validationError) {
    toast.error(`${t('diary.form.validationFailed')}: ${validationError.message}`)
    return
  }

  saving.value = true
  try {
    const payload = {
      ...buildDiaryAuthoringPayload(form),
      ...(appendToExisting.value ? { appendToToday: true } : {}),
    }
    let savedDiaryId = currentDiaryId.value

    if (currentDiaryId.value && !appendToExisting.value) {
      await runWithAuthRecovery(async (): Promise<void> => {
        await $fetch(`/api/diaries/${currentDiaryId.value}` as string, {
          method: 'PUT' as const,
          body: payload
        } as any)
      })
    } else {
      const created = await runWithAuthRecovery(() => $fetch<any>('/api/diaries', {
        method: 'POST' as const,
        body: payload,
      }))
      savedDiaryId = created?.id != null ? String(created.id) : null
    }

    toast.success(t('diary.updateSuccess'))

    // Mark the exact form that was persisted as clean before leaving the page.
    draftGuard.markClean()

    // Show random discipline quote
    await showDisciplineToast()

    router.push(savedDiaryId ? `/diaries/${savedDiaryId}` : '/diaries')
  } catch (e: any) {
    if (isAuthSessionError(e)) return
    console.error(e)
    toast.error(resolveErrorMessage(e, t, t('diary.saveFailed')))
  } finally {
    saving.value = false
  }
}
</script>
