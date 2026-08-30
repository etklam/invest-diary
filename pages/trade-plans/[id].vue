<template>
  <div class="mx-auto max-w-[920px] space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">{{ $t('tradePlan.kicker') }}</p>
        <h1 class="font-display mt-1 text-3xl tracking-tight text-dt-text">
          {{ tradePlan?.symbol || $t('tradePlan.title') }}
        </h1>
      </div>
      <div class="flex flex-wrap gap-2">
        <BaseButton to="/trade-plans" variant="secondary">{{ $t('tradePlan.actions.backToList') }}</BaseButton>
        <BaseButton v-if="tradePlan" variant="danger" :disabled="deleting" @click="deleteTradePlan">
          {{ $t('common.delete') }}
        </BaseButton>
      </div>
    </header>

    <section v-if="pending" class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-md">
      <AppSkeleton variant="card" :count="3" />
    </section>

    <section v-else-if="error" class="rounded-dt-md border border-dt-danger/30 bg-dt-surface p-5 text-dt-danger shadow-dt-md">
      {{ $t('tradePlan.loadFailed') }}
    </section>

    <template v-else-if="tradePlan">
      <LedgerCard v-if="tradePlan.diary" :title="$t('tradePlan.decisionContext.title')">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <h2 class="break-words text-lg font-bold text-dt-text">{{ tradePlan.diary.title }}</h2>
            <p class="mt-1 font-data text-sm text-dt-text-muted">{{ formatDiaryDate(tradePlan.diary.date) }}</p>
            <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
                  {{ $t('tradePlan.decisionContext.review') }}
                </dt>
                <dd class="mt-1 text-dt-text">{{ decisionReviewLabel }}</dd>
              </div>
              <div>
                <dt class="sr-only">{{ $t('tradePlan.decisionContext.transactions') }}</dt>
                <dd class="text-dt-text-muted">
                  {{ $t('tradePlan.decisionContext.recordedTransactions', { count: tradePlan.diary.transactionCount ?? 0 }) }}
                </dd>
              </div>
            </dl>
          </div>
          <BaseButton :to="`/diaries/${tradePlan.diary.id}`" class="w-full shrink-0 sm:w-auto">
            {{ $t('tradePlan.decisionContext.viewDecision') }}
          </BaseButton>
        </div>
      </LedgerCard>

      <TradePlanForm
        :initial="initialForm"
        :diaries="diaryOptions"
        :saving="saving"
        :submit-label="$t('tradePlan.actions.save')"
        @submit="updateTradePlan"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { DiariesApiResponse } from '~/types/diary'
import type { TradePlan, TradePlanFormValue } from '~/types/trade-plan'
import { isAuthSessionError } from '~/lib/auth/session-error'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const { runWithAuthRecovery } = useAuthRecovery()
const saving = ref(false)
const deleting = ref(false)
const tradePlanId = computed(() => String(route.params.id || ''))

const { data: tradePlan, pending, error, refresh } = await useLazyFetch<TradePlan>(() => `/api/trade-plans/${tradePlanId.value}`)
const { data: diariesResponse } = await useLazyFetch<DiariesApiResponse>('/api/diaries', {
  query: { limit: '100' },
  default: () => ({ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } }),
})

const diaryOptions = computed(() => diariesResponse.value?.data ?? [])
const { formatLocaleDate } = useTimezone()

const formatDiaryDate = (value: string) => formatLocaleDate(value, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const decisionReviewLabel = computed(() => {
  const diary = tradePlan.value?.diary
  if (!diary) return ''
  if (diary.reviewOutcome) return `${t('review.statusReviewed')} · ${t(`review.outcomes.${diary.reviewOutcome}`)}`
  if (diary.reviewStatus === 'reviewed') return t('review.statusReviewed')
  if (diary.reviewStatus === 'pending') return t('review.statusPending')
  return t('review.statusNone')
})

const formString = (value?: string | number | null) => value === null || value === undefined ? '' : String(value)

const initialForm = computed<Partial<TradePlanFormValue>>(() => ({
  diaryId: tradePlan.value?.diaryId ? String(tradePlan.value.diaryId) : '',
  symbol: tradePlan.value?.symbol ?? '',
  setupType: tradePlan.value?.setupType ?? '',
  entryPrice: formString(tradePlan.value?.entryPrice),
  entryZoneLow: formString(tradePlan.value?.entryZoneLow),
  entryZoneHigh: formString(tradePlan.value?.entryZoneHigh),
  stopLoss: formString(tradePlan.value?.stopLoss),
  targetPrice: formString(tradePlan.value?.targetPrice),
  maxPositionSize: formString(tradePlan.value?.maxPositionSize),
  invalidationCondition: tradePlan.value?.invalidationCondition ?? '',
  notes: tradePlan.value?.notes ?? '',
  status: tradePlan.value?.status ?? 'draft',
}))

const toPayload = (value: TradePlanFormValue) => Object.fromEntries(
  Object.entries(value).map(([key, fieldValue]) => [
    key,
    typeof fieldValue === 'string' && fieldValue.trim() === '' ? null : fieldValue,
  ]),
)

const updateTradePlan = async (value: TradePlanFormValue) => {
  if (saving.value) return
  saving.value = true
  try {
    await runWithAuthRecovery(() => $fetch(`/api/trade-plans/${tradePlanId.value}`, {
      method: 'PUT',
      body: toPayload(value),
    }))
    toast.success(t('tradePlan.messages.saved'))
    await refresh()
  } catch (err) {
    if (isAuthSessionError(err)) return
    toast.error(t('tradePlan.messages.saveFailed'))
  } finally {
    saving.value = false
  }
}

const deleteTradePlan = async () => {
  if (deleting.value || !confirm(t('tradePlan.messages.deleteConfirm'))) return
  deleting.value = true
  try {
    await runWithAuthRecovery(() => $fetch(`/api/trade-plans/${tradePlanId.value}`, { method: 'DELETE' }))
    toast.success(t('tradePlan.messages.deleted'))
    await router.push('/trade-plans')
  } catch (err) {
    if (isAuthSessionError(err)) return
    toast.error(t('tradePlan.messages.deleteFailed'))
  } finally {
    deleting.value = false
  }
}
</script>
