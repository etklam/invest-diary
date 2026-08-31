<template>
  <PageContainer width="app" class="space-y-6 pb-20">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <NuxtLink to="/stocks" class="inline-flex min-h-11 items-center gap-1.5 text-sm text-dt-text-muted hover:text-dt-primary">
          <Icon name="heroicons:arrow-left" class="h-4 w-4" />
          {{ t('companyHub.backToPortfolio') }}
        </NuxtLink>
        <p class="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">{{ t('companyHub.kicker') }}</p>
        <h1 class="font-display mt-1 text-3xl tracking-tight text-dt-text">{{ displaySymbol }}</h1>
        <p v-if="hub?.company.name" class="mt-1 text-sm text-dt-text-muted">{{ hub.company.name }}</p>
      </div>
      <BaseButton variant="secondary" @click="showNoteEditor = true">
        <Icon name="heroicons:pencil-square" class="h-4 w-4" />
        {{ t('stock.notes.write') }}
      </BaseButton>
    </header>

    <section v-if="pending" class="rounded-dt-md border border-dt-border bg-dt-surface p-6">
      <AppSkeleton variant="card" :count="3" />
    </section>

    <ErrorState
      v-else-if="error"
      :title="t('companyHub.loadFailed')"
      :message="error.message"
      :retry-fn="refresh"
    />

    <template v-else-if="hub">
      <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-sm" aria-labelledby="company-position-heading">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-dt-secondary">{{ t('companyHub.position.kicker') }}</p>
            <h2 id="company-position-heading" class="font-display mt-1 text-2xl text-dt-text">{{ t('companyHub.position.title') }}</h2>
          </div>
          <span class="rounded-dt-pill bg-dt-surface-strong px-3 py-1 text-xs font-semibold text-dt-text-muted">
            {{ t(`companyHub.position.states.${hub.position.state}`) }}
          </span>
        </div>
        <dl class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div v-for="metric in positionMetrics" :key="metric.label" class="rounded-dt-sm bg-dt-surface-strong p-4">
            <dt class="text-xs font-semibold uppercase tracking-[0.1em] text-dt-text-soft">{{ metric.label }}</dt>
            <dd class="font-data mt-2 text-lg font-semibold text-dt-text">{{ metric.value }}</dd>
            <p v-if="metric.hint" class="mt-1 text-xs text-dt-text-soft">{{ metric.hint }}</p>
          </div>
        </dl>
        <p v-if="hub.position.quoteStatus === 'missing'" class="mt-4 text-sm text-dt-warning">
          {{ t('companyHub.position.quoteMissing') }}
        </p>
      </section>

      <InvestmentThesisPanel
        :thesis="hub.thesis"
        :reviews="hub.reviews"
        :saving="savingThesis"
        @save="saveThesis"
        @review="completeReview"
      />

      <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-sm" aria-labelledby="company-changes-heading">
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-dt-secondary">{{ t('companyHub.changes.kicker') }}</p>
        <h2 id="company-changes-heading" class="font-display mt-1 text-2xl text-dt-text">{{ t('companyHub.changes.title') }}</h2>

        <div v-if="showNoteEditor" class="mt-5">
          <StockNoteEditor :show-cancel="true" :saving="savingNote" @save="saveNote" @cancel="showNoteEditor = false" />
        </div>

        <div class="mt-5 grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="related-diaries-heading">
            <h3 id="related-diaries-heading" class="text-base font-semibold text-dt-text">{{ t('companyHub.relatedDiaries') }}</h3>
            <ul v-if="hub.relatedDiaries.length" class="mt-3 divide-y divide-dt-border">
              <li v-for="diary in hub.relatedDiaries" :key="diary.id">
                <NuxtLink :to="`/diaries/${diary.id}`" class="block min-h-14 py-3 hover:text-dt-primary">
                  <span class="block text-sm font-semibold text-dt-text">{{ diary.title }}</span>
                  <span class="mt-1 block text-xs text-dt-text-soft">{{ formatDate(diary.date) }} · {{ t(`companyHub.relations.${diary.relation}`) }}</span>
                </NuxtLink>
              </li>
            </ul>
            <p v-else class="mt-3 text-sm text-dt-text-soft">{{ t('companyHub.empty.diaries') }}</p>
          </section>

          <section aria-labelledby="company-notes-heading">
            <h3 id="company-notes-heading" class="text-base font-semibold text-dt-text">{{ t('companyHub.recentNotes') }}</h3>
            <ul v-if="hub.notes.length" class="mt-3 space-y-3">
              <li v-for="note in hub.notes" :key="note.id" class="rounded-dt-sm bg-dt-surface-strong p-4">
                <div class="flex flex-wrap justify-between gap-2">
                  <h4 class="text-sm font-semibold text-dt-text">{{ note.title }}</h4>
                  <span class="text-xs text-dt-text-soft">{{ note.source === 'owner' ? t('companyHub.sources.me') : note.sourceName }}</span>
                </div>
                <p class="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-dt-text-muted">{{ note.content }}</p>
                <time class="mt-2 block text-xs text-dt-text-soft">{{ formatDate(note.date) }}</time>
              </li>
            </ul>
            <p v-else class="mt-3 text-sm text-dt-text-soft">{{ t('companyHub.empty.notes') }}</p>
          </section>
        </div>

        <details class="mt-6 border-t border-dt-border pt-4">
          <summary class="cursor-pointer text-sm font-semibold text-dt-text">{{ t('companyHub.evidence') }} · {{ hub.evidence.length }}</summary>
          <ul v-if="hub.evidence.length" class="mt-3 space-y-3">
            <li v-for="record in hub.evidence" :key="record.id" class="rounded-dt-sm bg-dt-surface-strong p-4">
              <div class="flex flex-wrap justify-between gap-2 text-xs text-dt-text-soft">
                <span>{{ record.sourceTitle || t(`stock.watchlist.sourceTypes.${record.sourceType}`, record.sourceType) }}</span>
                <time>{{ formatDate(record.occurredAt) }}</time>
              </div>
              <p class="mt-2 text-sm leading-6 text-dt-text-muted">{{ record.summary }}</p>
              <a v-if="record.sourceUrl" :href="record.sourceUrl" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex text-sm font-semibold text-dt-primary">{{ t('companyHub.openSource') }}</a>
            </li>
          </ul>
          <p v-else class="mt-3 text-sm text-dt-text-soft">{{ t('companyHub.empty.evidence') }}</p>
        </details>
      </section>
    </template>
  </PageContainer>
</template>

<script setup lang="ts">
import type { CompanyHubResponse } from '~/types/company-hub'
import type { CompleteThesisReviewInput, InvestmentThesisDraft, InvestmentThesisStatus } from '~/types/investment-thesis'
import type { StockNoteDraft } from '~/types/stock-note'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { t, locale } = useI18n()
const { formatLocaleDate } = useTimezone()
const toast = useToast()
const displaySymbol = computed(() => String(route.params.symbol).toUpperCase())
const showNoteEditor = ref(false)
const savingNote = ref(false)
const savingThesis = ref(false)

const { data: hub, pending, error, refresh } = await useLazyFetch<CompanyHubResponse>(
  () => `/api/stocks/${encodeURIComponent(displaySymbol.value)}/hub`,
  { server: false },
)

const currency = computed(() => hub.value?.company.currency || null)
const formatMoney = (value: number | null) => {
  if (value === null) return '—'
  const formatter = currency.value
    ? new Intl.NumberFormat(locale.value || 'zh-TW', { style: 'currency', currency: currency.value, maximumFractionDigits: 2 })
    : new Intl.NumberFormat(locale.value || 'zh-TW', { maximumFractionDigits: 2 })
  return formatter.format(value)
}
const formatNumber = (value: number) => new Intl.NumberFormat(locale.value || 'zh-TW', { maximumFractionDigits: 4 }).format(value)
const formatDate = (value: string) => formatLocaleDate(value, { dateStyle: 'medium' })

const positionMetrics = computed(() => hub.value ? [
  { label: t('companyHub.position.quantity'), value: formatNumber(hub.value.position.quantity) },
  { label: t('companyHub.position.averageCost'), value: formatMoney(hub.value.position.averageCost) },
  { label: t('companyHub.position.marketPrice'), value: formatMoney(hub.value.position.price) },
  { label: t('companyHub.position.marketValue'), value: formatMoney(hub.value.position.marketValue) },
  {
    label: t('companyHub.position.concentration'),
    value: hub.value.position.concentrationPct === null ? '—' : `${hub.value.position.concentrationPct.toFixed(1)}%`,
    hint: hub.value.position.concentrationBasis === 'cost_basis' ? t('companyHub.position.costBasis') : '',
  },
] : [])

async function saveThesis(payload: InvestmentThesisDraft & { status: InvestmentThesisStatus }) {
  savingThesis.value = true
  try {
    await $fetch(`/api/stocks/${encodeURIComponent(displaySymbol.value)}/thesis`, { method: 'PUT', body: payload } as any)
    toast.success(t('investmentThesis.saved'))
    await refresh()
  } catch {
    toast.error(t('investmentThesis.saveFailed'))
  } finally {
    savingThesis.value = false
  }
}

async function completeReview(payload: CompleteThesisReviewInput) {
  savingThesis.value = true
  try {
    await $fetch(`/api/stocks/${encodeURIComponent(displaySymbol.value)}/thesis/reviews`, { method: 'POST', body: payload } as any)
    toast.success(t('investmentThesis.review.saved'))
    await refresh()
  } catch {
    toast.error(t('investmentThesis.review.saveFailed'))
  } finally {
    savingThesis.value = false
  }
}

async function saveNote(payload: StockNoteDraft) {
  savingNote.value = true
  try {
    await $fetch(`/api/stocks/${encodeURIComponent(displaySymbol.value)}/notes`, { method: 'POST', body: payload })
    showNoteEditor.value = false
    toast.success(t('stock.notes.saveSuccess'))
    await refresh()
  } catch {
    toast.error(t('common.error'))
  } finally {
    savingNote.value = false
  }
}

useHead({ title: computed(() => `${displaySymbol.value} - ${t('companyHub.title')} - Investment Diary`) })
</script>
