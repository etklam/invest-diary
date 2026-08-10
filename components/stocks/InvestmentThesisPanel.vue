<template>
  <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-sm" aria-labelledby="investment-thesis-heading">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-dt-secondary">{{ t('investmentThesis.kicker') }}</p>
        <h2 id="investment-thesis-heading" class="font-display mt-1 text-2xl text-dt-text">{{ t('investmentThesis.title') }}</h2>
      </div>
      <span v-if="thesis" class="rounded-dt-pill bg-dt-surface-strong px-3 py-1 text-xs font-semibold text-dt-text-muted">
        {{ t(`investmentThesis.health.${thesis.health}`) }}
      </span>
    </div>

    <div v-if="!thesis && !editing" class="mt-5 rounded-dt-sm border border-dashed border-dt-border px-4 py-8 text-center">
      <p class="text-sm text-dt-text-muted">{{ t('investmentThesis.empty') }}</p>
      <BaseButton class="mt-4" @click="startCreate">{{ t('investmentThesis.create') }}</BaseButton>
    </div>

    <form v-else-if="editing" class="mt-5 space-y-4" @submit.prevent="submitActive">
      <label class="block text-sm font-semibold text-dt-text">
        {{ t('investmentThesis.fields.summary') }}
        <textarea v-model="form.summary" rows="2" :class="inputClass" />
      </label>
      <label class="block text-sm font-semibold text-dt-text">
        {{ t('investmentThesis.fields.whyIOwnIt') }}
        <textarea v-model="form.whyIOwnIt" rows="4" :class="inputClass" />
      </label>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="block text-sm font-semibold text-dt-text">
          {{ t('investmentThesis.fields.growthDrivers') }}
          <textarea v-model="form.growthDrivers" rows="4" :class="inputClass" />
        </label>
        <label class="block text-sm font-semibold text-dt-text">
          {{ t('investmentThesis.fields.risks') }}
          <textarea v-model="form.risks" rows="4" :class="inputClass" />
        </label>
      </div>
      <label class="block text-sm font-semibold text-dt-text">
        {{ t('investmentThesis.fields.invalidationConditions') }}
        <textarea v-model="form.invalidationConditions" rows="3" :class="inputClass" />
      </label>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="block text-sm font-semibold text-dt-text">
          {{ t('investmentThesis.fields.expectedHoldingPeriod') }}
          <input v-model="form.expectedHoldingPeriod" type="text" :class="inputClass" />
        </label>
        <label class="block text-sm font-semibold text-dt-text">
          {{ t('investmentThesis.fields.reviewDueAt') }}
          <input v-model="form.reviewDueAt" type="date" :class="inputClass" />
        </label>
      </div>
      <div class="flex flex-wrap justify-end gap-2">
        <BaseButton type="button" variant="ghost" @click="editing = false">{{ t('common.cancel') }}</BaseButton>
        <BaseButton type="button" variant="secondary" :disabled="saving" @click="submitThesis('DRAFT')">{{ t('investmentThesis.saveDraft') }}</BaseButton>
        <BaseButton type="submit" :disabled="saving">{{ t('investmentThesis.activate') }}</BaseButton>
      </div>
    </form>

    <div v-else-if="thesis" class="mt-5 space-y-5">
      <div>
        <h3 class="text-lg font-semibold text-dt-text">{{ thesis.summary || t('investmentThesis.noSummary') }}</h3>
        <p v-if="thesis.whyIOwnIt" class="mt-2 whitespace-pre-wrap text-sm leading-6 text-dt-text-muted">{{ thesis.whyIOwnIt }}</p>
      </div>
      <dl class="grid gap-4 md:grid-cols-2">
        <div v-for="field in visibleFields" :key="field.key" class="rounded-dt-sm bg-dt-surface-strong p-4">
          <dt class="text-xs font-semibold uppercase tracking-[0.1em] text-dt-text-soft">{{ field.label }}</dt>
          <dd class="mt-2 whitespace-pre-wrap text-sm leading-6 text-dt-text-muted">{{ field.value }}</dd>
        </div>
      </dl>
      <div class="flex flex-wrap gap-2">
        <BaseButton variant="secondary" @click="startEdit">{{ t('common.edit') }}</BaseButton>
        <BaseButton v-if="thesis.status !== 'ARCHIVED'" variant="secondary" @click="reviewing = true">{{ t('investmentThesis.review.start') }}</BaseButton>
        <BaseButton v-if="thesis.status !== 'ARCHIVED'" variant="ghost" :disabled="saving" @click="archive">{{ t('investmentThesis.archive') }}</BaseButton>
      </div>
    </div>

    <form v-if="reviewing" class="mt-6 space-y-4 border-t border-dt-border pt-5" @submit.prevent="submitReview">
      <h3 class="font-display text-xl text-dt-text">{{ t('investmentThesis.review.title') }}</h3>
      <fieldset>
        <legend class="text-sm font-semibold text-dt-text">{{ t('investmentThesis.review.outcome') }}</legend>
        <div class="mt-2 flex flex-wrap gap-2">
          <label v-for="outcome in outcomes" :key="outcome" class="inline-flex min-h-11 items-center gap-2 rounded-dt-sm border border-dt-border px-3 text-sm text-dt-text">
            <input v-model="reviewForm.outcome" type="radio" :value="outcome" required />
            {{ t(`review.outcomes.${outcome}`) }}
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend class="text-sm font-semibold text-dt-text">{{ t('investmentThesis.review.decision') }}</legend>
        <div class="mt-2 flex flex-wrap gap-2">
          <label v-for="decision in decisions" :key="decision" class="inline-flex min-h-11 items-center gap-2 rounded-dt-sm border border-dt-border px-3 text-sm text-dt-text">
            <input v-model="reviewForm.portfolioDecision" type="radio" :value="decision" required />
            {{ t(`investmentThesis.decisions.${decision}`) }}
          </label>
        </div>
      </fieldset>
      <div class="grid gap-4 md:grid-cols-3">
        <label v-for="field in reviewFields" :key="field.key" class="block text-sm font-semibold text-dt-text">
          {{ field.label }}
          <textarea v-model="reviewForm[field.key]" rows="4" :class="inputClass" />
        </label>
      </div>
      <label class="inline-flex min-h-11 items-center gap-2 text-sm text-dt-text">
        <input v-model="reviewForm.invalidationTriggered" type="checkbox" />
        {{ t('investmentThesis.review.invalidationTriggered') }}
      </label>
      <p v-if="reviewError" role="alert" class="text-sm text-dt-danger">{{ reviewError }}</p>
      <div class="flex justify-end gap-2">
        <BaseButton type="button" variant="ghost" @click="reviewing = false">{{ t('common.cancel') }}</BaseButton>
        <BaseButton type="submit" :disabled="saving">{{ t('investmentThesis.review.complete') }}</BaseButton>
      </div>
    </form>

    <details v-if="reviews.length" class="mt-6 border-t border-dt-border pt-4">
      <summary class="cursor-pointer text-sm font-semibold text-dt-text">{{ t('investmentThesis.review.history') }} · {{ reviews.length }}</summary>
      <ol class="mt-4 space-y-3">
        <li v-for="review in reviews" :key="String(review.id)" class="rounded-dt-sm bg-dt-surface-strong p-4">
          <div class="flex flex-wrap justify-between gap-2 text-xs text-dt-text-soft">
            <time>{{ formatDate(review.reviewedAt) }}</time>
            <span>{{ t(`review.outcomes.${review.outcome}`) }} · {{ t(`investmentThesis.decisions.${review.portfolioDecision}`) }}</span>
          </div>
          <p class="mt-2 text-sm text-dt-text-muted">{{ review.whatChanged || review.whatImproved || review.whatDeteriorated }}</p>
          <p class="mt-2 text-xs text-dt-text-soft">{{ t('investmentThesis.review.snapshot') }}: {{ review.snapshot.summary || t('investmentThesis.noSummary') }}</p>
        </li>
      </ol>
    </details>
  </section>
</template>

<script setup lang="ts">
import type {
  CompleteThesisReviewInput,
  CurrentInvestmentThesis,
  InvestmentThesisDraft,
  InvestmentThesisStatus,
  ThesisPortfolioDecision,
  ThesisReviewOutcome,
  ThesisReviewRecord,
} from '~/types/investment-thesis'
import { THESIS_PORTFOLIO_DECISIONS, THESIS_REVIEW_OUTCOMES } from '~/types/investment-thesis'

const props = withDefaults(defineProps<{
  thesis: CurrentInvestmentThesis | null
  reviews?: ThesisReviewRecord[]
  saving?: boolean
}>(), { reviews: () => [], saving: false })

const emit = defineEmits<{
  (event: 'save', value: InvestmentThesisDraft & { status: InvestmentThesisStatus }): void
  (event: 'review', value: CompleteThesisReviewInput): void
}>()

const { t, locale } = useI18n()
const editing = ref(false)
const reviewing = ref(false)
const inputClass = 'mt-1 block min-h-11 w-full rounded-dt-sm border border-dt-border bg-dt-surface-strong p-3 text-sm font-normal text-dt-text outline-none focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20'
const outcomes = THESIS_REVIEW_OUTCOMES
const decisions = THESIS_PORTFOLIO_DECISIONS
const emptyForm = () => ({ summary: '', whyIOwnIt: '', growthDrivers: '', risks: '', invalidationConditions: '', expectedHoldingPeriod: '', reviewDueAt: '' })
const form = reactive(emptyForm())
const reviewForm = reactive<{
  outcome: ThesisReviewOutcome | ''
  portfolioDecision: ThesisPortfolioDecision | ''
  whatImproved: string
  whatDeteriorated: string
  whatChanged: string
  invalidationTriggered: boolean
}>({ outcome: '', portfolioDecision: '', whatImproved: '', whatDeteriorated: '', whatChanged: '', invalidationTriggered: false })
const reviewError = ref('')

const visibleFields = computed(() => [
  { key: 'growthDrivers', label: t('investmentThesis.fields.growthDrivers'), value: props.thesis?.growthDrivers },
  { key: 'risks', label: t('investmentThesis.fields.risks'), value: props.thesis?.risks },
  { key: 'invalidationConditions', label: t('investmentThesis.fields.invalidationConditions'), value: props.thesis?.invalidationConditions },
  { key: 'expectedHoldingPeriod', label: t('investmentThesis.fields.expectedHoldingPeriod'), value: props.thesis?.expectedHoldingPeriod },
].filter(field => field.value))
const reviewFields = computed(() => [
  { key: 'whatImproved' as const, label: t('investmentThesis.review.whatImproved') },
  { key: 'whatDeteriorated' as const, label: t('investmentThesis.review.whatDeteriorated') },
  { key: 'whatChanged' as const, label: t('investmentThesis.review.whatChanged') },
])

function hydrate() {
  Object.assign(form, emptyForm(), props.thesis ?? {})
  form.reviewDueAt = props.thesis?.reviewDueAt?.slice(0, 10) ?? ''
}
function startCreate() { hydrate(); editing.value = true }
function startEdit() { hydrate(); editing.value = true }
function submitThesis(status: InvestmentThesisStatus = 'ACTIVE') {
  emit('save', { ...form, reviewDueAt: form.reviewDueAt ? new Date(`${form.reviewDueAt}T12:00:00Z`).toISOString() : null, status })
}
function submitActive() { submitThesis('ACTIVE') }
function archive() {
  if (!props.thesis) return
  emit('save', {
    summary: props.thesis.summary,
    whyIOwnIt: props.thesis.whyIOwnIt,
    growthDrivers: props.thesis.growthDrivers,
    risks: props.thesis.risks,
    invalidationConditions: props.thesis.invalidationConditions,
    expectedHoldingPeriod: props.thesis.expectedHoldingPeriod,
    reviewDueAt: props.thesis.reviewDueAt,
    status: 'ARCHIVED',
  })
}
function submitReview() {
  reviewError.value = ''
  if (!reviewForm.outcome || !reviewForm.portfolioDecision || ![reviewForm.whatImproved, reviewForm.whatDeteriorated, reviewForm.whatChanged].some(value => value.trim())) {
    reviewError.value = t('investmentThesis.review.validation')
    return
  }
  emit('review', {
    outcome: reviewForm.outcome,
    portfolioDecision: reviewForm.portfolioDecision,
    whatImproved: reviewForm.whatImproved,
    whatDeteriorated: reviewForm.whatDeteriorated,
    whatChanged: reviewForm.whatChanged,
    invalidationTriggered: reviewForm.invalidationTriggered,
  })
  reviewing.value = false
}
function formatDate(value: string) { return new Intl.DateTimeFormat(locale.value || 'zh-TW', { dateStyle: 'medium' }).format(new Date(value)) }

watch(() => props.thesis, hydrate, { immediate: true })
</script>
