<template>
  <PageContainer v-if="pending" width="app" class="flex flex-col items-center justify-center gap-3 py-16 text-dt-text-muted">
    <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-dt-primary" />
    <p>{{ t('common.loading') }}</p>
  </PageContainer>

  <PageContainer v-else-if="error" width="app">
    <ErrorState
      :title="t('diary.loadFailed')"
      :message="error.message"
      :retry-fn="refresh"
    />
  </PageContainer>

  <PageContainer v-else width="app">
    <div class="mx-auto w-full max-w-4xl space-y-6">
      <DiaryAuthoringForm
        :form="form"
        editing
        :saving="saving"
        :checking-date="checkingDate"
        :pending-conflict="pendingConflict"
        :date-lookup-error="dateLookupError"
        :cancel-to="`/diaries/${currentDiaryId || routeId}`"
        :resolve-date-conflict="resolveDateConflict"
        :retry-date-lookup="retryDateLookup"
        @save="saveDiary"
        @cancel="cancelEditing"
      />
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import DiaryAuthoringForm from '~/components/diaries/DiaryAuthoringForm.vue'
import { useAuthRecovery } from '~/composables/useAuthRecovery'
import { showDisciplineToast } from '~/composables/useDiscipline'
import { resolveErrorMessage } from '~/composables/useErrorI18n'
import { isAuthSessionError } from '~/lib/auth/session-error'
import {
  createEmptyDiaryAuthoringForm,
  hydrateDiaryAuthoring,
} from '~/lib/diary-authoring/hydration'
import { buildDiaryAuthoringPayload } from '~/lib/diary-authoring/payload'
import type { DiaryAuthoringForm as DiaryAuthoringFormData } from '~/lib/diary-authoring/types'
import { useDiaryDateConflict } from '~/lib/diary-authoring/date-conflict'
import { useDiaryDraftGuard } from '~/lib/diary-authoring/draft-guard'

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
const { data: diary, pending, error, refresh } = await useLazyFetch<any>(`/api/diaries/${routeId}`)

const form = reactive<DiaryAuthoringFormData>(createEmptyDiaryAuthoringForm(getTodayDateString()))
const draftGuard = useDiaryDraftGuard(() => form)

const {
  checkingDate,
  dateLookupError,
  pendingConflict,
  appendToExisting,
  committedDate,
  diaryId: currentDiaryId,
  replaceForm,
  resolveDateConflict,
  retryDateLookup,
} = useDiaryDateConflict({
  form,
  draftGuard,
  fetchDiaryByDate: (date) => runWithAuthRecovery(() => $fetch<any>(
    `/api/diaries/by-date?date=${encodeURIComponent(date)}`
  )),
  reportLookupError: (lookupError) => toast.error(resolveErrorMessage(lookupError, t, t('diary.form.checkExistingFailed'))),
  timeZone: () => getTimezone(),
  initialDiaryId: routeId,
  initialCommittedDate: getTodayDateString(),
})

watch(diary, (newDiary) => {
  if (!newDiary) return
  const hydrated = hydrateDiaryAuthoring(newDiary, {
    timeZone: getTimezone(),
    fallbackDate: getTodayDateString(),
  })
  replaceForm(hydrated)
  currentDiaryId.value = String(newDiary.id ?? routeId)
  committedDate.value = hydrated.date
  appendToExisting.value = false
  pendingConflict.value = null
  dateLookupError.value = false
  draftGuard.markClean()
}, { immediate: true })

const cancelEditing = () => {
  if (!draftGuard.confirmLeave()) return
  draftGuard.allowNextRouteLeave()
  void router.push(`/diaries/${currentDiaryId.value || routeId}`)
}

const saveDiary = async () => {
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
          body: payload,
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
    draftGuard.markClean()
    await showDisciplineToast()
    router.push(savedDiaryId ? `/diaries/${savedDiaryId}` : '/diaries')
  } catch (error: any) {
    if (isAuthSessionError(error)) return
    console.error(error)
    toast.error(resolveErrorMessage(error, t, t('diary.saveFailed')))
  } finally {
    saving.value = false
  }
}
</script>
