<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <!-- Header: 標題 + 日期（日記的身分欄位，放第一視線） -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-display text-2xl font-semibold tracking-tight text-dt-text">
        {{ isEditing ? t('diary.editDiary') : t('diary.newDiary') }}
      </h1>
      <label class="flex items-center gap-2">
        <span class="text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.diaryDate') }}</span>
        <Icon v-if="checkingDate" name="svg-spinners:180-ring-with-bg" class="h-4 w-4 text-dt-primary" />
        <input
          type="date"
          id="diary-date"
          v-model="form.date"
          :disabled="checkingDate"
          :class="inputClass"
          class="w-auto font-mono"
        />
      </label>
    </div>

    <p v-if="isEditing" class="rounded-dt-sm border border-dt-border bg-dt-surface-strong px-4 py-2 text-sm text-dt-text-muted">
      <Icon name="heroicons:information-circle" class="mr-1 inline-block h-4 w-4 align-text-bottom text-dt-info" />
      {{ t('diary.form.existingLoaded') }}
    </p>

    <form @submit.prevent="saveDiary" class="space-y-6">
      <LedgerCard>
        <DiaryEditor
          v-model:title="form.title"
          v-model:content="form.content"
        />
      </LedgerCard>

      <!-- Thesis & Risk -->
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
          <div class="mb-4 flex justify-end">
            <BaseButton variant="ghost" :disabled="loadingLatest" @click="copyFromLatest">
              <Icon v-if="loadingLatest" name="svg-spinners:180-ring-with-bg" class="h-4 w-4" />
              <Icon v-else name="heroicons:document-duplicate" class="h-4 w-4" />
              {{ t('diary.form.copyFromLatest') }}
            </BaseButton>
          </div>
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
          to="/diaries"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-dt-sm border border-dt-border bg-dt-surface px-4 py-2 text-sm font-semibold text-dt-text transition-colors duration-150 hover:bg-dt-surface-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30"
        >
          {{ t('common.cancel') }}
        </NuxtLink>
        <BaseButton type="submit" :disabled="saving">
          <Icon v-if="saving" name="svg-spinners:180-ring-with-bg" class="h-4 w-4" />
          {{ isEditing ? t('common.save') : t('diary.writeDiary') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthRecovery } from '~/composables/useAuthRecovery'
import { isAuthSessionError } from '~/lib/auth/session-error'
import { resolveErrorMessage } from '~/composables/useErrorI18n'
import {
  createEmptyDiaryAuthoringForm,
  hydrateDiaryAuthoring,
  hydrateTransaction,
} from '~/lib/diary-authoring/hydration'
import { buildDiaryAuthoringPayload } from '~/lib/diary-authoring/payload'
import type { DiaryAuthoringForm } from '~/lib/diary-authoring/types'
import { validateDiaryDraft } from '~/lib/diary-authoring/validation'

definePageMeta({
  middleware: 'auth'
})

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const saving = ref(false)
const checkingDate = ref(false)
const loadingLatest = ref(false)
const isEditing = ref(false)
const existingDiaryId = ref<string | null>(null)
const { runWithAuthRecovery } = useAuthRecovery()
const { getTodayDateString, formatLocaleDate, getTimezone } = useTimezone()

const inputClass = 'mt-1 block w-full min-h-[44px] rounded-dt-sm border border-dt-border bg-dt-surface px-3 text-sm text-dt-text focus:border-dt-primary focus:outline-none disabled:opacity-50'

// Get date from URL query parameter or use today
const initialDate = (route.query.date as string) || getTodayDateString()

const form = reactive<DiaryAuthoringForm>(createEmptyDiaryAuthoringForm(initialDate))

// Progressive disclosure：進階區塊預設收合，有資料時自動展開
const showTransactions = ref(form.transactions.length > 0)
const showAlerts = ref(form.alerts.length > 0)
watch(() => form.transactions.length, (n) => { if (n > 0) showTransactions.value = true })
watch(() => form.alerts.length, (n) => { if (n > 0) showAlerts.value = true })

// Watch for date changes and check if diary exists
watch(() => form.date, async (newDate) => {
  if (!newDate) return

  checkingDate.value = true
  try {
    const existingDiary = await runWithAuthRecovery(() => $fetch<any>(`/api/diaries/by-date?date=${newDate}`))
    if (existingDiary) {
      // Diary exists for this date, load it for editing
      isEditing.value = true
      existingDiaryId.value = existingDiary.id.toString()

      Object.assign(form, hydrateDiaryAuthoring(existingDiary, {
        timeZone: getTimezone(),
        fallbackDate: newDate,
      }))
    } else {
      // No diary exists for this date, reset form for new entry
      isEditing.value = false
      existingDiaryId.value = null
      Object.assign(form, createEmptyDiaryAuthoringForm(newDate))
    }
  } catch (error: any) {
    if (isAuthSessionError(error)) return
    toast.error(resolveErrorMessage(error, t, t('diary.form.checkExistingFailed')))
  } finally {
    checkingDate.value = false
  }
})

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

// Copy transactions from latest diary
const copyFromLatest = async () => {
  loadingLatest.value = true
  try {
    const latest = await runWithAuthRecovery(() => $fetch<any>('/api/transactions/latest'))

    if (latest && latest.transactions && latest.transactions.length > 0) {
      // Add transactions to form
      const newTransactions = latest.transactions.map((tx: any) => hydrateTransaction({
        ...tx,
        trade_date: `${getTodayDateString()}T12:00:00`,
      }))

      // Append to existing transactions or replace if empty
      if (form.transactions.length === 0) {
        form.transactions = newTransactions
      } else {
        form.transactions = [...form.transactions, ...newTransactions]
      }

      // Show success feedback
      const diaryDate = formatLocaleDate(latest.diary_date)
      toast.success(t('diary.form.copySuccess', { count: newTransactions.length, date: diaryDate }))
    } else {
      toast.warning(t('diary.form.copyEmpty'))
    }
  } catch (error: any) {
    if (isAuthSessionError(error)) return
    console.error('Error fetching latest transactions:', error)
    toast.error(t('diary.form.copyFailed'))
  } finally {
    loadingLatest.value = false
  }
}

const saveDiary = async () => {
  if (!form.title) {
    toast.error(t('diary.titleRequired'))
    return
  }

  // No baseline is loaded on this page. The client may provide UX hints only;
  // it must not treat the current table as the whole portfolio.
  const validationError = validateDiaryDraft(form.transactions, { available: false })
  if (validationError) {
    toast.error(`${t('diary.form.validationFailed')}: ${validationError.message}`)
    return
  }

  saving.value = true
  try {
    const payload = buildDiaryAuthoringPayload(form)

    if (isEditing.value && existingDiaryId.value) {
      // Update existing diary
      await runWithAuthRecovery(async (): Promise<void> => {
        await $fetch(`/api/diaries/${existingDiaryId.value}` as string, {
          method: 'PUT' as const,
          body: payload
        } as any)
      })
      toast.success(t('diary.updateSuccess'))
    } else {
      // Create new diary
      await runWithAuthRecovery(async () => {
        return await $fetch('/api/diaries', {
          method: 'POST',
          body: payload
        })
      })
      toast.success(t('diary.saveSuccess'))
    }

    // Show random discipline quote
    await showDisciplineToast()

    router.push('/diaries')
  } catch (e: any) {
    if (isAuthSessionError(e)) return
    console.error(e)
    toast.error(resolveErrorMessage(e, t, t('diary.saveFailed')))
  } finally {
    saving.value = false
  }
}

</script>
