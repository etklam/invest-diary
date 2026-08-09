<template>
  <div class="mx-auto w-full max-w-[1040px] space-y-6 pb-16">
    <div v-if="pending" class="rounded-dt-md border border-dt-border bg-dt-surface p-8 text-center shadow-dt-sm">
      <Icon name="svg-spinners:180-ring-with-bg" class="mx-auto h-8 w-8 text-dt-primary" />
      <p class="mt-3 text-sm text-dt-text-muted">{{ t('common.loading') }}</p>
    </div>

    <ErrorState v-else-if="error" :title="t('review.page.loadFailed')" :message="error.message" />

    <template v-else-if="diary">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <NuxtLink :to="`/diaries/${diary.id}`" class="inline-flex items-center text-sm font-semibold text-dt-secondary hover:text-dt-primary">
            <Icon name="heroicons:arrow-left" class="mr-1.5 h-4 w-4" />
            {{ t('review.page.backToDiary') }}
          </NuxtLink>
          <p class="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">{{ t('review.page.kicker') }}</p>
          <h1 class="font-display mt-1 break-words text-3xl tracking-tight text-dt-text">{{ diary.title }}</h1>
          <p class="mt-2 font-data text-sm text-dt-text-muted">{{ formatDate(diary.date) }}</p>
        </div>
        <StatusBadge v-if="hasStructuredReview" tone="success">
          {{ t(`review.outcomes.${diary.reviewOutcome}`) }}
        </StatusBadge>
        <StatusBadge v-else-if="isLegacyReview" tone="neutral">{{ t('review.legacyBadge') }}</StatusBadge>
      </header>

      <LedgerCard :title="t('review.page.originalContext')" :description="t('review.page.originalContextDesc')">
        <div v-if="hasDecisionFields" class="grid gap-4 md:grid-cols-3">
          <div v-if="diary.thesis" class="rounded-dt-sm border border-dt-border bg-dt-surface-strong p-4">
            <h2 class="text-xs font-bold uppercase tracking-[0.12em] text-dt-text-soft">{{ t('review.fields.thesis') }}</h2>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-dt-text">{{ diary.thesis }}</p>
          </div>
          <div v-if="diary.risk" class="rounded-dt-sm border border-dt-border bg-dt-surface-strong p-4">
            <h2 class="text-xs font-bold uppercase tracking-[0.12em] text-dt-text-soft">{{ t('review.fields.risk') }}</h2>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-dt-text">{{ diary.risk }}</p>
          </div>
          <div v-if="diary.execution" class="rounded-dt-sm border border-dt-border bg-dt-surface-strong p-4">
            <h2 class="text-xs font-bold uppercase tracking-[0.12em] text-dt-text-soft">{{ t('review.fields.execution') }}</h2>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-dt-text">{{ diary.execution }}</p>
          </div>
        </div>
        <div v-if="diary.content" class="prose dark:prose-invert mt-4 max-w-none rounded-dt-sm border border-dt-border bg-dt-surface-strong p-4">
          <MDC :value="diary.content" />
        </div>
        <p v-if="!hasDecisionFields && !diary.content" class="text-sm text-dt-text-muted">{{ t('review.page.noOriginalContext') }}</p>
      </LedgerCard>

      <section v-if="hasStructuredReview && !editing" aria-labelledby="review-result-title">
        <LedgerCard :title="t('review.page.completedTitle')" :description="reviewedDescription">
          <div class="grid gap-4 md:grid-cols-3">
            <div v-for="field in completedFields" :key="field.key" class="rounded-dt-sm border border-dt-border bg-dt-surface-strong p-4">
              <h3 class="text-xs font-bold uppercase tracking-[0.12em] text-dt-text-soft">{{ field.label }}</h3>
              <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-dt-text">{{ field.value }}</p>
            </div>
          </div>
          <nav :aria-label="t('review.page.nextActions')" class="mt-5 flex flex-wrap gap-3">
            <BaseButton variant="secondary" @click="editing = true">
              <Icon name="heroicons:pencil" class="mr-2 h-4 w-4" />
              {{ t('review.page.editReview') }}
            </BaseButton>
            <BaseButton :to="`/diaries/${diary.id}`" variant="secondary">
              <Icon name="heroicons:book-open" class="mr-2 h-4 w-4" aria-hidden="true" />
              {{ t('review.page.viewDecision') }}
            </BaseButton>
            <BaseButton to="/timeline" variant="ghost">
              <Icon name="heroicons:queue-list" class="mr-2 h-4 w-4" aria-hidden="true" />
              {{ t('review.page.viewTimeline') }}
            </BaseButton>
          </nav>
        </LedgerCard>
      </section>

      <LedgerCard v-else :title="t('review.page.formTitle')" :description="t('review.page.formDesc')">
        <div v-if="isLegacyReview && !editing" class="mb-5 rounded-dt-sm border border-dt-warning/40 bg-dt-surface-strong p-4 text-sm text-dt-text">
          <p>{{ t('review.page.legacyNotice') }}</p>
        </div>

        <form class="space-y-6" @submit.prevent="saveReview">
          <fieldset>
            <legend class="text-sm font-bold text-dt-text">{{ t('review.fields.outcome') }}</legend>
            <p class="mt-1 text-sm text-dt-text-muted">{{ t('review.fields.outcomeHelp') }}</p>
            <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label
                v-for="outcome in REVIEW_OUTCOMES"
                :key="outcome"
                class="flex min-h-12 cursor-pointer items-center gap-3 rounded-dt-sm border border-dt-border bg-dt-surface-strong px-4 py-3 text-sm text-dt-text focus-within:border-dt-primary focus-within:ring-2 focus-within:ring-dt-primary/20"
              >
                <input v-model="form.reviewOutcome" type="radio" name="reviewOutcome" :value="outcome" class="h-4 w-4" required />
                <span>{{ t(`review.outcomes.${outcome}`) }}</span>
              </label>
            </div>
          </fieldset>

          <div class="grid gap-5 md:grid-cols-3">
            <label v-for="field in reflectionFields" :key="field.key" class="block">
              <span class="text-sm font-bold text-dt-text">{{ field.label }}</span>
              <span class="mt-1 block text-xs leading-relaxed text-dt-text-muted">{{ field.help }}</span>
              <textarea
                v-model="form[field.key]"
                :name="field.key"
                rows="7"
                maxlength="10000"
                class="mt-2 min-h-36 w-full resize-y rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-3 text-sm leading-relaxed text-dt-text outline-none focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20"
              />
            </label>
          </div>

          <p v-if="formError" role="alert" class="rounded-dt-sm border border-dt-danger/30 bg-dt-surface-strong p-3 text-sm text-dt-danger">
            {{ formError }}
          </p>
          <p class="sr-only" aria-live="polite">{{ saveAnnouncement }}</p>

          <div class="flex flex-col-reverse gap-3 border-t border-dt-border pt-5 sm:flex-row sm:justify-end">
            <BaseButton v-if="hasStructuredReview" type="button" variant="ghost" :disabled="saving" @click="editing = false">
              {{ t('common.cancel') }}
            </BaseButton>
            <BaseButton type="submit" variant="primary" :disabled="saving">
              <Icon :name="saving ? 'svg-spinners:180-ring-with-bg' : 'heroicons:check'" class="mr-2 h-4 w-4" />
              {{ saving ? t('review.page.saving') : t('review.page.save') }}
            </BaseButton>
          </div>
        </form>
      </LedgerCard>

      <div v-if="diary.transactions.length || diary.tradePlans.length" class="grid gap-6 lg:grid-cols-2">
        <LedgerCard v-if="diary.transactions.length" :title="t('review.page.transactions')">
          <ul class="space-y-2">
            <li v-for="transaction in diary.transactions" :key="transaction.id" class="flex flex-wrap items-center justify-between gap-2 rounded-dt-sm border border-dt-border bg-dt-surface-strong p-3 text-sm">
              <span class="font-data font-bold text-dt-text">{{ transaction.symbol }}</span>
              <StatusBadge :tone="transaction.type === 'BUY' ? 'success' : 'danger'">{{ transaction.type }}</StatusBadge>
              <span class="font-data text-dt-text-muted">{{ transaction.quantity }} × {{ transaction.price }}</span>
            </li>
          </ul>
        </LedgerCard>
        <LedgerCard v-if="diary.tradePlans.length" :title="t('review.page.tradePlans')">
          <ul class="space-y-2">
            <li v-for="plan in diary.tradePlans" :key="plan.id" class="rounded-dt-sm border border-dt-border bg-dt-surface-strong p-3 text-sm">
              <div class="flex items-center justify-between gap-2">
                <span class="font-data font-bold text-dt-text">{{ plan.symbol }}</span>
                <StatusBadge tone="neutral">{{ plan.status }}</StatusBadge>
              </div>
              <p v-if="plan.setupType" class="mt-2 text-dt-text-muted">{{ plan.setupType }}</p>
              <p v-if="plan.invalidationCondition" class="mt-1 text-dt-text-muted">{{ plan.invalidationCondition }}</p>
            </li>
          </ul>
        </LedgerCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { isAuthSessionError } from '~/lib/auth/session-error'
import { REVIEW_OUTCOMES, type ReviewOutcome } from '~/types/diary'

definePageMeta({ middleware: 'auth' })

interface ReviewDetail {
  id: string
  title: string
  date: string
  content: string | null
  tagsString: string | null
  thesis: string | null
  risk: string | null
  execution: string | null
  reviewDueAt: string | null
  reviewStatus: string | null
  reviewedAt: string | null
  reviewOutcome: ReviewOutcome | null
  reviewSummary: string | null
  reviewLearning: string | null
  reviewAdjustment: string | null
  transactions: Array<{ id: string; symbol: string; type: 'BUY' | 'SELL'; quantity: string; price: string; tradeDate: string }>
  tradePlans: Array<{ id: string; symbol: string; setupType: string | null; invalidationCondition: string | null; status: string }>
}

type ReflectionKey = 'reviewSummary' | 'reviewLearning' | 'reviewAdjustment'

const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const { runWithAuthRecovery } = useAuthRecovery()
const { formatLocaleDate, formatLocaleDateTime } = useTimezone()
const { data: diary, pending, error } = await useLazyFetch<ReviewDetail>(`/api/diaries/${route.params.id}/review`)

const editing = ref(false)
const saving = ref(false)
const formError = ref('')
const saveAnnouncement = ref('')
const form = reactive<Record<ReflectionKey, string> & { reviewOutcome: ReviewOutcome | '' }>({
  reviewOutcome: '',
  reviewSummary: '',
  reviewLearning: '',
  reviewAdjustment: '',
})

watch(diary, (value) => {
  if (!value) return
  form.reviewOutcome = value.reviewOutcome || ''
  form.reviewSummary = value.reviewSummary || ''
  form.reviewLearning = value.reviewLearning || ''
  form.reviewAdjustment = value.reviewAdjustment || ''
}, { immediate: true })

const hasStructuredReview = computed(() => Boolean(diary.value?.reviewOutcome))
const isLegacyReview = computed(() => diary.value?.reviewStatus === 'reviewed' && !diary.value.reviewOutcome)
const hasDecisionFields = computed(() => Boolean(diary.value?.thesis || diary.value?.risk || diary.value?.execution))
const formatDate = (value: string) => formatLocaleDate(value, { year: 'numeric', month: 'long', day: 'numeric' })
const reviewedDescription = computed(() => diary.value?.reviewedAt
  ? t('review.page.reviewedAt', { date: formatLocaleDateTime(diary.value.reviewedAt) })
  : t('review.page.completedDesc'))

const reflectionFields = computed<Array<{ key: ReflectionKey; label: string; help: string }>>(() => [
  { key: 'reviewSummary', label: t('review.fields.summary'), help: t('review.fields.summaryHelp') },
  { key: 'reviewLearning', label: t('review.fields.learning'), help: t('review.fields.learningHelp') },
  { key: 'reviewAdjustment', label: t('review.fields.adjustment'), help: t('review.fields.adjustmentHelp') },
])

const completedFields = computed(() => reflectionFields.value
  .map(field => ({ ...field, value: diary.value?.[field.key] }))
  .filter((field): field is typeof field & { value: string } => Boolean(field.value)))

async function saveReview() {
  formError.value = ''
  saveAnnouncement.value = ''
  const hasReflection = reflectionFields.value.some(field => form[field.key].trim())
  if (!form.reviewOutcome || !hasReflection) {
    formError.value = t('review.page.validationError')
    return
  }

  saving.value = true
  try {
    const result = await runWithAuthRecovery(() => $fetch<ReviewDetail>(`/api/diaries/${route.params.id}/review`, {
      method: 'PATCH',
      body: {
        reviewOutcome: form.reviewOutcome,
        reviewSummary: form.reviewSummary,
        reviewLearning: form.reviewLearning,
        reviewAdjustment: form.reviewAdjustment,
      },
    }))
    diary.value = result
    editing.value = false
    saveAnnouncement.value = t('review.page.saved')
    toast.success(t('review.page.saved'))
  } catch (err) {
    if (isAuthSessionError(err)) return
    formError.value = t('review.page.saveFailed')
    saveAnnouncement.value = formError.value
  } finally {
    saving.value = false
  }
}
</script>
