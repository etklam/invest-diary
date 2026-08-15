<template>
  <div v-if="initialPreflightPending" class="mx-auto flex max-w-4xl flex-col items-center justify-center gap-3 py-16 text-dt-text-muted" data-testid="diary-initial-preflight">
    <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-dt-primary" />
    <p>{{ t('common.loading') }}</p>
  </div>

  <div v-else class="mx-auto max-w-4xl space-y-6">
    <DiaryAuthoringForm
      :form="form"
      :editing="isEditing"
      :saving="saving"
      :checking-date="checkingDate"
      :pending-conflict="pendingConflict"
      :date-lookup-error="dateLookupError"
      cancel-to="/diaries"
      :copy-from-latest="copyFromLatest"
      :resolve-date-conflict="resolveDateConflict"
      :retry-date-lookup="retryDateLookup"
      @save="saveDiary"
      @cancel="cancelAuthoring"
    />
  </div>
</template>

<script setup lang="ts">
import DiaryAuthoringForm from '~/components/diaries/DiaryAuthoringForm.vue'
import { useAuthRecovery } from '~/composables/useAuthRecovery'
import { showDisciplineToast } from '~/composables/useDiscipline'
import { resolveErrorMessage } from '~/composables/useErrorI18n'
import { isAuthSessionError } from '~/lib/auth/session-error'
import {
  createEmptyDiaryAuthoringForm,
  hydrateTransaction,
} from '~/lib/diary-authoring/hydration'
import { buildDiaryAuthoringPayload } from '~/lib/diary-authoring/payload'
import type { DiaryAuthoringForm as DiaryAuthoringFormData } from '~/lib/diary-authoring/types'
import { useDiaryDateConflict } from '~/lib/diary-authoring/date-conflict'
import { useDiaryDraftGuard } from '~/lib/diary-authoring/draft-guard'

definePageMeta({
  middleware: 'auth'
})

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const saving = ref(false)
const initialPreflightPending = ref(true)
const { runWithAuthRecovery } = useAuthRecovery()
const { getTodayDateString, formatLocaleDate, getTimezone } = useTimezone()
const initialDate = (route.query.date as string) || getTodayDateString()
const form = reactive<DiaryAuthoringFormData>(createEmptyDiaryAuthoringForm(initialDate))
const draftGuard = useDiaryDraftGuard(() => form)

const {
  checkingDate,
  isEditing,
  diaryId: existingDiaryId,
  appendToExisting,
  dateLookupError,
  pendingConflict,
  lookupDiaryForDate,
  resolveDateConflict,
  retryDateLookup,
} = useDiaryDateConflict({
  form,
  draftGuard,
  fetchDiaryByDate: (date) => runWithAuthRecovery(() => $fetch<any>(
    `/api/diaries/by-date?date=${encodeURIComponent(date)}`
  )),
  reportLookupError: (error) => toast.error(resolveErrorMessage(error, t, t('diary.form.checkExistingFailed'))),
  timeZone: () => getTimezone(),
  initialCommittedDate: initialDate,
})

onMounted(() => {
  draftGuard.markClean()
  void lookupDiaryForDate(initialDate, { initial: true })
    .finally(() => { initialPreflightPending.value = false })
})

const cancelAuthoring = () => {
  if (!draftGuard.confirmLeave()) return
  draftGuard.allowNextRouteLeave()
  void router.push('/diaries')
}

const copyFromLatest = async () => {
  try {
    const latest = await runWithAuthRecovery(() => $fetch<any>('/api/transactions/latest'))
    if (latest?.transactions?.length) {
      const newTransactions = latest.transactions.map((transaction: any) => hydrateTransaction({
        ...transaction,
        trade_date: `${getTodayDateString()}T12:00:00`,
      }))
      form.transactions = form.transactions.length === 0
        ? newTransactions
        : [...form.transactions, ...newTransactions]
      const diaryDate = formatLocaleDate(latest.diary_date)
      toast.success(t('diary.form.copySuccess', { count: newTransactions.length, date: diaryDate }))
    } else {
      toast.warning(t('diary.form.copyEmpty'))
    }
  } catch (error: any) {
    if (isAuthSessionError(error)) return
    console.error('Error fetching latest transactions:', error)
    toast.error(t('diary.form.copyFailed'))
  }
}

const saveDiary = async () => {
  saving.value = true
  try {
    const payload = {
      ...buildDiaryAuthoringPayload(form),
      ...(appendToExisting.value ? { appendToToday: true } : {}),
    }

    if (isEditing.value && existingDiaryId.value) {
      await runWithAuthRecovery(async (): Promise<void> => {
        await $fetch(`/api/diaries/${existingDiaryId.value}` as string, {
          method: 'PUT' as const,
          body: payload,
        } as any)
      })
      toast.success(t('diary.updateSuccess'))
    } else {
      await runWithAuthRecovery(() => $fetch('/api/diaries', {
        method: 'POST',
        body: payload,
      }))
      toast.success(t('diary.saveSuccess'))
    }

    draftGuard.markClean()
    await showDisciplineToast()
    router.push('/diaries')
  } catch (error: any) {
    if (isAuthSessionError(error)) return
    console.error(error)
    toast.error(resolveErrorMessage(error, t, t('diary.saveFailed')))
  } finally {
    saving.value = false
  }
}
</script>
