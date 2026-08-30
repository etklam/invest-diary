<template>
  <div v-if="pending" class="flex flex-col items-center justify-center py-16">
    <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-dt-primary" />
    <p class="mt-3 text-sm text-dt-text-muted">{{ t('common.loading') }}</p>
  </div>

  <ErrorState v-else-if="error" :title="t('diary.loadFailed')" :message="error.message" :retry-fn="refresh" />

  <div v-else-if="diary" class="mx-auto w-full max-w-[1040px] space-y-6 pb-16">
    <header class="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
          {{ t('diary.decisionRecord.kicker') }}
        </p>
        <h1 class="font-display mt-1 break-words text-2xl font-semibold tracking-tight text-dt-text sm:text-3xl">
          {{ diary.title }}
        </h1>
        <p class="mt-2 font-data text-sm text-dt-text-muted">
          {{ formatDecisionDate(diary.date) }}
        </p>
        <div v-if="diary.tags?.length" class="mt-3 flex flex-wrap gap-2" :aria-label="t('diary.decisionRecord.tags')">
          <span
            v-for="tag in diary.tags"
            :key="tag"
            class="rounded-dt-pill border border-dt-border bg-dt-surface px-2.5 py-1 text-xs font-semibold text-dt-text-muted"
          >
            #{{ tag }}
          </span>
        </div>
      </div>

      <div class="flex w-full gap-3 sm:w-auto">
        <BaseButton variant="secondary" class="flex-1 sm:flex-none" @click="router.push(`/diaries/${diary.id}/edit`)">
          <Icon name="heroicons:pencil" class="h-4 w-4" aria-hidden="true" />
          {{ t('common.edit') }}
        </BaseButton>
        <BaseButton variant="danger" class="flex-1 sm:flex-none" :disabled="deleting" @click="deleteDiary">
          <Icon
            :name="deleting ? 'svg-spinners:180-ring-with-bg' : 'heroicons:trash'"
            class="h-4 w-4"
            aria-hidden="true"
          />
          {{ t('common.delete') }}
        </BaseButton>
      </div>
    </header>

    <div class="overflow-hidden rounded-dt-md border border-dt-border bg-dt-surface shadow-dt-sm divide-y divide-dt-border">
      <DecisionRecordSection
        heading-id="original-decision-title"
        step="01"
        :title="t('diary.decisionRecord.originalDecision')"
        :description="t('diary.decisionRecord.originalDecisionDesc')"
      >
        <div v-if="hasDecisionFields" class="grid gap-5 md:grid-cols-3">
          <article v-if="diary.thesis" class="rounded-dt-sm border border-dt-secondary/25 bg-dt-secondary/5 p-4">
            <h3 class="text-xs font-semibold uppercase tracking-[0.1em] text-dt-text-muted">{{ t('diary.fields.thesis') }}</h3>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-dt-text">{{ diary.thesis }}</p>
          </article>
          <article v-if="diary.risk" class="rounded-dt-sm border border-dt-warning/25 bg-dt-warning/5 p-4">
            <h3 class="text-xs font-semibold uppercase tracking-[0.1em] text-dt-text-muted">{{ t('diary.fields.risk') }}</h3>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-dt-text">{{ diary.risk }}</p>
          </article>
          <article v-if="diary.execution" class="rounded-dt-sm border border-dt-primary/25 bg-dt-primary/5 p-4">
            <h3 class="text-xs font-semibold uppercase tracking-[0.1em] text-dt-text-muted">{{ t('diary.decisionRecord.executionIntent') }}</h3>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-dt-text">{{ diary.execution }}</p>
          </article>
        </div>

        <div v-if="diary.content" :class="hasDecisionFields ? 'mt-6 border-t border-dt-border pt-5' : ''">
          <h3 v-if="!hasDecisionFields" class="text-xs font-semibold uppercase tracking-[0.1em] text-dt-text-muted">
            {{ t('diary.decisionRecord.originalDiary') }}
          </h3>
          <div class="prose dark:prose-invert mt-2 max-w-none">
            <MDC :value="diary.content" />
          </div>
        </div>

        <p v-if="!hasDecisionFields && !diary.content" class="text-sm text-dt-text-muted">
          {{ t('review.page.noOriginalContext') }}
        </p>
      </DecisionRecordSection>

      <DecisionRecordSection
        heading-id="trade-plan-title"
        step="02"
        :title="t('diary.decisionRecord.tradePlans')"
        :description="t('diary.decisionRecord.tradePlansDesc')"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p v-if="!tradePlans.length" class="text-sm text-dt-text-muted">
            {{ t('diary.decisionRecord.noTradePlans') }}
          </p>
          <p v-else class="font-data text-xs text-dt-text-muted">
            {{ t('timeline.tradePlansCount', { count: tradePlans.length }) }}
          </p>
          <BaseButton :to="createTradePlanRoute" :variant="tradePlans.length ? 'secondary' : 'primary'" class="w-full sm:w-auto">
            <Icon name="heroicons:map" class="h-4 w-4" aria-hidden="true" />
            {{ t('tradePlan.actions.createFromDiary') }}
          </BaseButton>
        </div>

        <ul v-if="tradePlans.length" class="mt-5 divide-y divide-dt-border border-y border-dt-border">
          <li v-for="plan in tradePlans" :key="String(plan.id)" class="py-5 first:pt-4 last:pb-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <NuxtLink
                :to="`/trade-plans/${plan.id}`"
                class="font-data font-semibold text-dt-primary transition-colors hover:text-dt-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30"
              >
                {{ plan.symbol }}
              </NuxtLink>
              <StatusBadge tone="neutral">{{ t(`tradePlan.status.${plan.status}`) }}</StatusBadge>
            </div>
            <dl v-if="tradePlanFields(plan).length" class="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="field in tradePlanFields(plan)" :key="field.label">
                <dt class="text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ field.label }}</dt>
                <dd class="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-dt-text">{{ field.value }}</dd>
              </div>
            </dl>
          </li>
        </ul>
      </DecisionRecordSection>

      <DecisionRecordSection
        heading-id="actual-execution-title"
        step="03"
        :title="t('diary.decisionRecord.actualExecution')"
        :description="t('diary.decisionRecord.actualExecutionDesc')"
      >
        <p v-if="!transactions.length" class="text-sm text-dt-text-muted">
          {{ t('diary.decisionRecord.noTransactions') }}
        </p>

        <template v-else>
          <ul class="space-y-3 sm:hidden">
            <li
              v-for="tx in transactions"
              :key="`mobile-${tx.id}`"
              class="rounded-dt-sm border border-dt-border bg-dt-surface-strong p-3"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-data text-sm font-semibold text-dt-text">{{ tx.symbol }}</span>
                <StatusBadge :tone="tx.type === 'BUY' ? 'success' : 'danger'">
                  {{ tx.type === 'BUY' ? t('diary.form.buy') : t('diary.form.sell') }}
                </StatusBadge>
              </div>
              <dl class="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt class="text-dt-text-muted">{{ t('diary.form.quantity') }}</dt>
                  <dd class="mt-0.5 font-data text-dt-text">{{ tx.quantity }}</dd>
                </div>
                <div class="text-right">
                  <dt class="text-dt-text-muted">{{ t('diary.form.price') }}</dt>
                  <dd class="mt-0.5 font-data text-dt-text">{{ tx.price }}</dd>
                </div>
                <div>
                  <dt class="text-dt-text-muted">{{ t('diary.view.total') }}</dt>
                  <dd class="mt-0.5 font-data text-dt-text">{{ transactionTotal(tx) }}</dd>
                </div>
                <div class="text-right">
                  <dt class="text-dt-text-muted">{{ t('diary.view.time') }}</dt>
                  <dd class="mt-0.5 font-data text-dt-text">{{ formatLocaleDateTime(tx.tradeDate) }}</dd>
                </div>
              </dl>
              <dl v-if="transactionContextFields(tx).length" class="mt-3 space-y-2 border-t border-dt-border pt-3 text-xs">
                <div v-for="field in transactionContextFields(tx)" :key="field.label">
                  <dt class="font-semibold text-dt-text-muted">{{ field.label }}</dt>
                  <dd class="mt-0.5 whitespace-pre-wrap text-dt-text">{{ field.value }}</dd>
                </div>
              </dl>
            </li>
          </ul>

          <div class="hidden overflow-x-auto sm:block">
            <table class="min-w-full divide-y divide-dt-border">
              <thead>
                <tr>
                  <th scope="col" class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.form.symbol') }}</th>
                  <th scope="col" class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.form.type') }}</th>
                  <th scope="col" class="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.form.quantity') }}</th>
                  <th scope="col" class="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.form.price') }}</th>
                  <th scope="col" class="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.view.total') }}</th>
                  <th scope="col" class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.view.time') }}</th>
                  <th v-if="hasAnyTransactionContext" scope="col" class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.decisionRecord.transactionContext') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dt-border">
                <tr v-for="tx in transactions" :key="String(tx.id)">
                  <td class="whitespace-nowrap px-3 py-3 font-data text-sm font-semibold text-dt-text">{{ tx.symbol }}</td>
                  <td class="whitespace-nowrap px-3 py-3 text-sm">
                    <StatusBadge :tone="tx.type === 'BUY' ? 'success' : 'danger'">
                      {{ tx.type === 'BUY' ? t('diary.form.buy') : t('diary.form.sell') }}
                    </StatusBadge>
                  </td>
                  <td class="whitespace-nowrap px-3 py-3 text-right font-data text-sm text-dt-text-soft">{{ tx.quantity }}</td>
                  <td class="whitespace-nowrap px-3 py-3 text-right font-data text-sm text-dt-text-soft">{{ tx.price }}</td>
                  <td class="whitespace-nowrap px-3 py-3 text-right font-data text-sm text-dt-text-soft">{{ transactionTotal(tx) }}</td>
                  <td class="whitespace-nowrap px-3 py-3 font-data text-sm text-dt-text-soft">{{ formatLocaleDateTime(tx.tradeDate) }}</td>
                  <td v-if="hasAnyTransactionContext" class="min-w-52 px-3 py-3 text-xs text-dt-text-soft">
                    <dl class="space-y-1.5">
                      <div v-for="field in transactionContextFields(tx)" :key="field.label">
                        <dt class="sr-only">{{ field.label }}</dt>
                        <dd><span class="font-semibold text-dt-text-muted">{{ field.label }}:</span> {{ field.value }}</dd>
                      </div>
                    </dl>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <details class="group mt-5 rounded-dt-sm border border-dt-border bg-dt-surface-strong">
            <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-dt-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dt-primary/30">
              <span>{{ t('diary.decisionRecord.holdings') }}</span>
              <Icon name="heroicons:chevron-down" class="h-4 w-4 text-dt-text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div class="border-t border-dt-border px-4 py-4">
              <HoldingsDisplay :transactions="holdingsTransactions" />
            </div>
          </details>
        </template>
      </DecisionRecordSection>

      <DecisionRecordSection
        heading-id="decision-review-title"
        step="04"
        :title="t('diary.decisionRecord.review')"
        :description="t('diary.decisionRecord.reviewDesc')"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-semibold text-dt-text">{{ diaryReviewLabel }}</p>
              <StatusBadge v-if="diary.reviewOutcome" tone="success">
                {{ t(`review.outcomes.${diary.reviewOutcome}`) }}
              </StatusBadge>
            </div>
            <p v-if="diary.reviewedAt" class="mt-1 font-data text-xs text-dt-text-muted">
              {{ t('review.page.reviewedAt', { date: formatLocaleDateTime(diary.reviewedAt) }) }}
            </p>
            <p v-else-if="diary.reviewDueAt" class="mt-1 font-data text-xs text-dt-text-muted">
              {{ t('review.fields.reviewDue') }} · {{ formatDecisionDate(diary.reviewDueAt) }}
            </p>
          </div>
          <BaseButton
            :to="`/diaries/${diary.id}/review`"
            :variant="diary.reviewStatus === 'reviewed' ? 'secondary' : 'primary'"
            class="w-full sm:w-auto"
          >
            {{ diary.reviewStatus === 'reviewed' ? t('review.viewReview') : t('review.startReview') }}
          </BaseButton>
        </div>

        <dl v-if="reviewFields.length" class="mt-5 grid gap-5 border-t border-dt-border pt-5 md:grid-cols-3">
          <div v-for="field in reviewFields" :key="field.label">
            <dt class="text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ field.label }}</dt>
            <dd class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-dt-text">{{ field.value }}</dd>
          </div>
        </dl>
      </DecisionRecordSection>
    </div>

    <section
      v-if="alerts.length"
      aria-labelledby="diary-alerts-title"
      class="rounded-dt-sm border border-dt-warning/40 bg-dt-surface p-4 shadow-dt-sm"
    >
      <div class="flex items-start gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-dt-sm border border-dt-warning/30 bg-dt-surface">
          <Icon name="heroicons:bell-alert" class="h-5 w-5 text-dt-warning" aria-hidden="true" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 id="diary-alerts-title" class="text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
            {{ t('diary.view.alerts') }}
          </h2>
          <ul class="mt-2 space-y-2">
            <li v-for="alert in alerts" :key="String(alert.id)" class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <p class="text-sm text-dt-text">{{ alert.message }}</p>
              <span class="shrink-0 font-data text-xs text-dt-text-muted">{{ formatLocaleDateTime(alert.triggerAt) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { DiaryResponse, TransactionResponse } from '~/lib/contracts/diary'
import type { TradePlan } from '~/types/trade-plan'
import { useAuthRecovery } from '~/composables/useAuthRecovery'
import { isAuthSessionError } from '~/lib/auth/session-error'

interface DisplayField {
  label: string
  value: string
}

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const id = route.params.id
const { t } = useI18n()
const toast = useToast()
const { runWithAuthRecovery } = useAuthRecovery()
const { formatLocaleDate, formatLocaleDateTime } = useTimezone()

const { data: diary, pending, error, refresh } = await useLazyFetch<DiaryResponse>(`/api/diaries/${id}`)

const transactions = computed(() => diary.value?.transactions ?? [])
const tradePlans = computed(() => diary.value?.tradePlans ?? [])
const alerts = computed(() => diary.value?.alerts ?? [])
const hasDecisionFields = computed(() => Boolean(diary.value?.thesis || diary.value?.risk || diary.value?.execution))
const hasAnyTransactionContext = computed(() => transactions.value.some(tx => transactionContextFields(tx).length > 0))
const holdingsTransactions = computed(() => transactions.value.map(tx => ({
  symbol: tx.symbol,
  type: tx.type,
  quantity: Number(tx.quantity),
  price: Number(tx.price),
  tradeDate: tx.tradeDate,
})))

const createTradePlanRoute = computed(() => ({
  path: '/trade-plans/new',
  query: { diaryId: String(diary.value?.id ?? id) },
}))

const diaryReviewLabel = computed(() => {
  if (diary.value?.reviewOutcome) return t('review.statusReviewed')
  if (diary.value?.reviewStatus === 'reviewed') return t('review.page.legacyNotice')
  return t('diary.decisionRecord.reviewPending')
})

const reviewFields = computed<DisplayField[]>(() => [
  { label: t('review.fields.summary'), value: diary.value?.reviewSummary },
  { label: t('review.fields.learning'), value: diary.value?.reviewLearning },
  { label: t('review.fields.adjustment'), value: diary.value?.reviewAdjustment },
].filter((field): field is DisplayField => Boolean(field.value)))

const hasValue = (value: unknown): boolean => value !== null && value !== undefined && String(value).trim() !== ''

const tradePlanFields = (plan: TradePlan): DisplayField[] => {
  const entryZone = [plan.entryZoneLow, plan.entryZoneHigh].filter(hasValue).join(' – ')
  return [
    { label: t('tradePlan.fields.setupType'), value: plan.setupType },
    { label: t('tradePlan.fields.entryPrice'), value: plan.entryPrice },
    { label: t('tradePlan.fields.entryZone'), value: entryZone },
    { label: t('tradePlan.fields.stopLoss'), value: plan.stopLoss },
    { label: t('tradePlan.fields.targetPrice'), value: plan.targetPrice },
    { label: t('tradePlan.fields.maxPositionSize'), value: plan.maxPositionSize },
    { label: t('tradePlan.fields.invalidationCondition'), value: plan.invalidationCondition },
    { label: t('tradePlan.fields.notes'), value: plan.notes },
  ].filter(field => hasValue(field.value)).map(field => ({ ...field, value: String(field.value) }))
}

const transactionContextFields = (transaction: TransactionResponse): DisplayField[] => [
  { label: t('diary.form.notes'), value: transaction.notes },
  { label: t('diary.form.strategy'), value: transaction.strategy },
  { label: t('diary.form.emotion'), value: transaction.emotion },
].filter((field): field is DisplayField => Boolean(field.value))

const transactionTotal = (transaction: TransactionResponse) => (
  Number(transaction.quantity) * Number(transaction.price)
).toFixed(2)

const formatDecisionDate = (value: string) => formatLocaleDate(value, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const deleting = ref(false)

const deleteDiary = async () => {
  if (deleting.value) return
  if (!confirm(t('diary.deleteConfirm'))) return

  deleting.value = true
  try {
    await runWithAuthRecovery(async (): Promise<void> => {
      await $fetch(`/api/diaries/${id}` as string, { method: 'DELETE' })
    })
    toast.success(t('diary.deleteSuccess'))
    await router.push('/diaries')
  } catch (error) {
    if (isAuthSessionError(error)) return
    toast.error(t('diary.deleteFailed'))
    console.error(error)
  } finally {
    deleting.value = false
  }
}
</script>
