<template>
  <div v-if="pending" class="text-center py-12">
    <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-indigo-600" />
    <p class="mt-2 text-gray-500">載入中...</p>
  </div>

  <div v-else-if="error" class="bg-red-50 p-4 rounded-md">
    <div class="flex">
      <div class="flex-shrink-0">
        <Icon name="heroicons:x-circle" class="h-5 w-5 text-red-400" />
      </div>
      <div class="ml-3">
        <h3 class="text-sm font-medium text-red-800">載入失敗</h3>
        <div class="mt-2 text-sm text-red-700">
          {{ error.message }}
        </div>
      </div>
    </div>
  </div>

  <div v-else class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">編輯日記</h1>
    </div>

    <div
      v-if="pendingConflict"
      role="dialog"
      aria-modal="true"
      data-testid="diary-date-conflict"
      class="space-y-4 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30"
    >
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('quickDiary.errors.diaryExists') }}</h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ $t('diary.form.existingLoaded') }}</p>
      </div>
      <div class="flex flex-wrap justify-end gap-3">
        <button type="button" class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white" @click="resolveDateConflict('edit')">
          {{ $t('common.edit') }}
        </button>
        <button type="button" class="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:text-gray-200" @click="resolveDateConflict('append')">
          {{ $t('quickDiary.appendDiary') }}
        </button>
        <button type="button" class="inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300" @click="resolveDateConflict('cancel')">
          {{ $t('common.cancel') }}
        </button>
      </div>
    </div>

    <div
      v-if="dateLookupError"
      role="alert"
      data-testid="diary-date-lookup-error"
      class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200"
    >
      <span>{{ $t('diary.form.checkExistingFailed') }}</span>
      <button type="button" class="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium dark:border-gray-600" @click="retryDateLookup">
        {{ $t('common.retry') }}
      </button>
    </div>

    <form v-if="!pendingConflict" @submit.prevent="saveDiary" class="space-y-8">
      <div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="diary-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300">日期</label>
            <input
              type="date"
              id="diary-date"
              v-model="form.date"
              :disabled="Boolean(pendingConflict)"
              class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            />
          </div>
        </div>
      </div>

      <DiaryEditor
        v-model:title="form.title"
        v-model:content="form.content"
        v-model:stock-symbols="form.stockSymbols"
      />

      <!-- Original decision context -->
      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">
            {{ $t('review.fields.thesis') }}
          </label>
          <textarea
            v-model="form.thesis"
            :placeholder="$t('review.fields.thesisPlaceholder')"
            class="mt-1 w-full rounded-lg border border-dt-border bg-dt-surface p-3 text-sm text-dt-text focus:border-dt-primary focus:outline-none"
            rows="3"
          />
        </div>
        <div>
          <label class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">
            {{ $t('review.fields.risk') }}
          </label>
          <textarea
            v-model="form.risk"
            :placeholder="$t('review.fields.riskPlaceholder')"
            class="mt-1 w-full rounded-lg border border-dt-border bg-dt-surface p-3 text-sm text-dt-text focus:border-dt-primary focus:outline-none"
            rows="3"
          />
        </div>
        <div>
          <label for="diary-execution" class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">
            {{ $t('review.fields.execution') }}
          </label>
          <textarea
            id="diary-execution"
            v-model="form.execution"
            :placeholder="$t('review.fields.executionPlaceholder')"
            class="mt-1 w-full rounded-lg border border-dt-border bg-dt-surface p-3 text-sm text-dt-text focus:border-dt-primary focus:outline-none"
            rows="3"
          />
        </div>
        <div>
          <label for="diary-review-due" class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">
            {{ $t('review.fields.reviewDue') }}
          </label>
          <input
            id="diary-review-due"
            v-model="form.reviewDueAt"
            type="date"
            class="mt-1 w-full rounded-lg border border-dt-border bg-dt-surface p-3 font-data text-sm text-dt-text focus:border-dt-primary focus:outline-none"
          />
        </div>
      </div>

      <TransactionInput v-model="form.transactions" />

      <div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">提醒設定</h3>
          <button
            type="button"
            @click="addAlert"
            class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Icon name="heroicons:plus" class="mr-2 h-4 w-4" />
            新增提醒
          </button>
        </div>

        <div v-if="form.alerts.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
          尚無提醒
        </div>

        <div v-else class="space-y-4">
          <div v-for="(alert, index) in form.alerts" :key="index" class="flex items-start space-x-4 bg-gray-50 dark:bg-gray-700 p-3 rounded-md relative">
            <button
              type="button"
              @click="removeAlert(index)"
              class="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            >
              <Icon name="heroicons:x-mark" class="h-5 w-5" />
            </button>
            
            <div class="flex-grow grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label :for="`alert-msg-${index}`" class="block text-xs font-medium text-gray-700 dark:text-gray-300">訊息</label>
                <input
                  type="text"
                  :id="`alert-msg-${index}`"
                  v-model="alert.message"
                  class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  placeholder="提醒內容"
                />
              </div>
              <div>
                <label :for="`alert-time-${index}`" class="block text-xs font-medium text-gray-700 dark:text-gray-300">提醒日期</label>
                <input
                  type="date"
                  :id="`alert-time-${index}`"
                  v-model="alert.trigger_at"
                  class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end space-x-3">
        <NuxtLink
          :to="`/diaries/${currentDiaryId || routeId}`"
          @click.prevent="cancelEditing"
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
        >
          取消
        </NuxtLink>
        <button
          type="submit"
          :disabled="saving"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <Icon v-if="saving" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
          儲存變更
        </button>
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

// Fetch disciplines for trade discipline checking
// Use lazy fetch to avoid calling API during SSR before auth check
const { data: diary, pending, error } = await useLazyFetch<any>(`/api/diaries/${routeId}`)

const form = reactive<DiaryAuthoringForm>(createEmptyDiaryAuthoringForm(getTodayDateString()))
const draftGuard = useDiaryDraftGuard(() => form)

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
    trigger_at: today
  })
}

const removeAlert = (index: number) => {
  form.alerts.splice(index, 1)
}

const saveDiary = async () => {
  if (!form.title) {
    toast.error('請輸入標題')
    return
  }

  // The server owns the portfolio baseline. Without a fetched baseline the
  // client must not mistake this diary's draft for the whole portfolio.
  const validationError = validateDiaryDraft(form.transactions, { available: false })
  if (validationError) {
    toast.error('交易記錄驗證失敗：' + validationError.message)
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

    toast.success('日記更新成功！')

    // Mark the exact form that was persisted as clean before leaving the page.
    draftGuard.markClean()

    // Show random discipline quote
    await showDisciplineToast()

    router.push(savedDiaryId ? `/diaries/${savedDiaryId}` : '/diaries')
  } catch (e: any) {
    if (isAuthSessionError(e)) return
    console.error(e)
    toast.error(resolveErrorMessage(e, t, '儲存失敗'))
  } finally {
    saving.value = false
  }
}
</script>
