<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-display text-2xl font-semibold tracking-tight text-dt-text">
        {{ editing ? t('diary.editDiary') : t('diary.newDiary') }}
      </h1>
      <label class="flex items-center gap-2">
        <span class="text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.diaryDate') }}</span>
        <Icon v-if="checkingDate" name="svg-spinners:180-ring-with-bg" class="h-4 w-4 text-dt-primary" />
        <input
          id="diary-date"
          v-model="form.date"
          type="date"
          :disabled="Boolean(pendingConflict)"
          :class="inputClass"
          class="w-auto font-mono"
        />
      </label>
    </div>

    <div
      v-if="pendingConflict"
      aria-labelledby="diary-conflict-title"
      data-testid="diary-date-conflict"
      class="space-y-4 rounded-dt-md border border-dt-warning/40 bg-dt-warning/10 px-5 py-4"
    >
      <div>
        <h2 id="diary-conflict-title" class="font-display text-lg font-semibold text-dt-text">{{ t('quickDiary.errors.diaryExists') }}</h2>
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

    <p v-if="editing" class="rounded-dt-sm border border-dt-border bg-dt-surface-strong px-4 py-2 text-sm text-dt-text-muted">
      <Icon name="heroicons:information-circle" class="mr-1 inline-block h-4 w-4 align-text-bottom text-dt-info" />
      {{ t('diary.form.existingLoaded') }}
    </p>

    <form v-if="!pendingConflict" class="space-y-6" @submit.prevent="submitForm">
      <LedgerCard>
        <DiaryEditor
          v-model:title="form.title"
          v-model:content="form.content"
          v-model:stock-symbols="form.stockSymbols"
        />
      </LedgerCard>

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

      <section class="rounded-dt-md border border-dt-border bg-dt-surface shadow-dt-sm">
        <button
          type="button"
          class="flex min-h-11 w-full items-center justify-between px-5 py-4 text-left sm:px-6"
          :aria-expanded="showTransactions"
          @click="showTransactions = !showTransactions"
        >
          <span class="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-dt-text">
            {{ t('diary.form.transactions') }}
            <span v-if="form.transactions.length" class="rounded-dt-pill bg-dt-surface-strong px-2 py-0.5 font-mono text-xs text-dt-text-muted">{{ form.transactions.length }}</span>
          </span>
          <Icon :name="showTransactions ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="h-5 w-5 text-dt-text-muted" />
        </button>
        <div v-show="showTransactions" class="border-t border-dt-border px-5 py-4 sm:px-6">
          <div v-if="copyFromLatest" class="mb-4 flex justify-end">
            <BaseButton variant="ghost" :disabled="loadingLatest" @click="copyLatestTransactions">
              <Icon v-if="loadingLatest" name="svg-spinners:180-ring-with-bg" class="h-4 w-4" />
              <Icon v-else name="heroicons:document-duplicate" class="h-4 w-4" />
              {{ t('diary.form.copyFromLatest') }}
            </BaseButton>
          </div>
          <TransactionInput v-model="form.transactions" />
        </div>
      </section>

      <section class="rounded-dt-md border border-dt-border bg-dt-surface shadow-dt-sm">
        <button
          type="button"
          class="flex min-h-11 w-full items-center justify-between px-5 py-4 text-left sm:px-6"
          :aria-expanded="showAlerts"
          @click="showAlerts = !showAlerts"
        >
          <span class="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-dt-text">
            {{ t('diary.form.alerts') }}
            <span v-if="form.alerts.length" class="rounded-dt-pill bg-dt-surface-strong px-2 py-0.5 font-mono text-xs text-dt-text-muted">{{ form.alerts.length }}</span>
          </span>
          <Icon :name="showAlerts ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="h-5 w-5 text-dt-text-muted" />
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
                class="absolute right-1 top-1 flex min-h-[44px] min-w-[44px] items-center justify-center text-dt-text-soft transition-colors hover:text-dt-danger"
                :aria-label="t('common.delete')"
                @click="removeAlert(index)"
              >
                <Icon name="heroicons:x-mark" class="h-5 w-5" />
              </button>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label :for="`alert-msg-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.alertMessage') }}</label>
                  <input :id="`alert-msg-${index}`" v-model="alert.message" type="text" :class="inputClass" :placeholder="t('diary.form.alertMessagePlaceholder')" />
                </div>
                <div>
                  <label :for="`alert-time-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.alertDate') }}</label>
                  <input :id="`alert-time-${index}`" v-model="alert.trigger_at" type="date" :class="inputClass" class="font-mono" />
                </div>
                <div>
                  <label :for="`alert-recurring-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.alertRecurring') }}</label>
                  <select :id="`alert-recurring-${index}`" v-model="alert.recurring_mode" :class="inputClass">
                    <option value="">{{ t('diary.form.recurringNone') }}</option>
                    <option value="WEEK">{{ t('diary.form.recurringWeek') }}</option>
                    <option value="MONTH">{{ t('diary.form.recurringMonth') }}</option>
                  </select>
                  <p class="mt-1 text-xs text-dt-text-soft">{{ getRecurringDescription(alert.recurring_mode) }}</p>
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

      <div class="flex justify-end gap-3">
        <NuxtLink
          :to="cancelTo"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-dt-sm border border-dt-border bg-dt-surface px-4 py-2 text-sm font-semibold text-dt-text transition-colors duration-150 hover:bg-dt-surface-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30"
          @click.prevent="emit('cancel')"
        >
          {{ t('common.cancel') }}
        </NuxtLink>
        <BaseButton data-testid="diary-submit" type="submit" :disabled="saving">
          <Icon v-if="saving" name="svg-spinners:180-ring-with-bg" class="h-4 w-4" />
          {{ editing ? t('common.save') : t('diary.writeDiary') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { validateDiaryDraft } from '~/lib/diary-authoring/validation'
import type { DiaryAuthoringForm } from '~/lib/diary-authoring/types'

const props = withDefaults(defineProps<{
  form: DiaryAuthoringForm
  editing?: boolean
  saving?: boolean
  checkingDate: boolean
  pendingConflict: { date: string; diary: Record<string, any> } | null
  dateLookupError: boolean
  cancelTo: string
  copyFromLatest?: () => void | Promise<void>
  resolveDateConflict: (choice: 'edit' | 'append' | 'cancel') => void
  retryDateLookup: () => void
}>(), {
  editing: false,
  saving: false,
  copyFromLatest: undefined,
})

const emit = defineEmits<{
  save: []
  cancel: []
}>()

const { t } = useI18n()
const { getTodayDateString } = useTimezone()
const toast = useToast()
const inputClass = 'mt-1 block w-full min-h-[44px] rounded-dt-sm border border-dt-border bg-dt-surface px-3 text-sm text-dt-text focus:border-dt-primary focus:outline-none disabled:opacity-50'
const form = props.form
const loadingLatest = ref(false)
const showTransactions = ref(form.transactions.length > 0)
const showAlerts = ref(form.alerts.length > 0)

watch(() => form.transactions.length, (count) => {
  if (count > 0) showTransactions.value = true
})
watch(() => form.alerts.length, (count) => {
  if (count > 0) showAlerts.value = true
})

const addAlert = () => {
  form.alerts.push({ message: '', trigger_at: getTodayDateString(), recurring_mode: '' })
}

const removeAlert = (index: number) => {
  form.alerts = form.alerts.filter((_, alertIndex) => alertIndex !== index)
}

const getRecurringDescription = (mode?: string) => {
  if (mode === 'WEEK') return t('diary.form.recurringWeekDesc')
  if (mode === 'MONTH') return t('diary.form.recurringMonthDesc')
  return t('diary.form.recurringOnceDesc')
}

const copyLatestTransactions = async () => {
  if (!props.copyFromLatest) return
  loadingLatest.value = true
  try {
    await props.copyFromLatest()
  } finally {
    loadingLatest.value = false
  }
}

const submitForm = () => {
  if (!form.title) {
    toast.error(t('diary.titleRequired'))
    return
  }

  const validationError = validateDiaryDraft(form.transactions)
  if (validationError) {
    toast.error(`${t('diary.form.validationFailed')}: ${validationError.message}`)
    return
  }

  emit('save')
}
</script>
