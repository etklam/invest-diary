<script setup lang="ts">
import { useSecFilingsTool } from '~/composables/useSecFilingsTool'
import { useResearchCapture } from '~/composables/useResearchCapture'
const { t, locale } = useI18n()
const tool = useSecFilingsTool()
const researchCapture = useResearchCapture()
const batchMode = ref<'primary' | 'complete'>('primary')
useHead(() => ({ title: `${t('secFilings.title')} - ${t('nav.tools')}`, meta: [{ name: 'description', content: t('secFilings.subtitle') }, { property: 'og:locale', content: locale.value }] }))
definePageMeta({ requiresAuth: false })
</script>
<template>
  <div class="min-h-screen bg-dt-bg">
    <PageContainer width="wide" class="space-y-6 py-6">
      <LedgerCard class="!p-6 sm:!p-8"><div class="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center"><div><p class="text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary">{{ t('secFilings.kicker') }}</p><h1 class="mt-3 font-display text-3xl font-semibold text-dt-text sm:text-4xl">{{ t('secFilings.title') }}</h1><p class="mt-3 max-w-2xl text-dt-text-muted">{{ t('secFilings.subtitle') }}</p></div><SecCompanySearch :results="tool.companies.value" :loading="tool.loading.value" @search="tool.searchCompanies" @select="tool.selectCompany" /></div></LedgerCard>

      <div v-if="tool.stale.value" class="rounded-dt-md border border-dt-warning/40 bg-dt-warning/10 p-4 text-sm text-dt-warning">{{ t('secFilings.stale') }}</div>
      <div v-if="tool.errorCode.value" class="rounded-dt-md border border-dt-danger/40 bg-dt-danger/10 p-4 text-sm text-dt-danger">{{ t(`error.code.${tool.errorCode.value.toLowerCase()}`) }}</div>

      <template v-if="tool.selectedCompany.value">
        <LedgerCard><p class="text-xs font-bold uppercase tracking-wider text-dt-text-muted">{{ t('secFilings.selectedCompany') }}</p><h2 class="mt-2 text-2xl font-semibold text-dt-text">{{ tool.selectedCompany.value.name }}</h2><p class="mt-1 font-data text-sm text-dt-text-muted">{{ tool.selectedCompany.value.tickers.join(', ') }} · CIK {{ tool.selectedCompany.value.cik }}</p></LedgerCard>
        <SecFilingFilters :model-value="tool.filters" @apply="tool.applyFilters" />
        <LedgerCard v-if="tool.selectedAccessions.value.length" class="sticky top-3 z-20"><div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p class="font-semibold text-dt-text">{{ t('secFilings.selectedCount', { count: tool.selectedAccessions.value.length }) }}</p><div class="flex flex-col gap-2 sm:flex-row"><select v-model="batchMode" :aria-label="t('secFilings.batchDownload')" class="min-h-11 rounded-dt-sm border border-dt-border bg-dt-bg px-3 text-dt-text"><option value="primary">{{ t('secFilings.primaryDocuments') }}</option><option value="complete">{{ t('secFilings.completeSubmissions') }}</option></select><a :href="tool.batchUrl(batchMode)" class="inline-flex min-h-11 items-center justify-center rounded-dt-sm bg-dt-primary-solid px-4 font-semibold text-white">{{ t('secFilings.batchDownload') }}</a></div></div></LedgerCard>
        <LedgerCard v-if="tool.loading.value && !tool.filingPage.value" class="py-16 text-center"><Icon name="heroicons:arrow-path" class="mx-auto h-8 w-8 animate-spin text-dt-primary" /><p class="mt-3 text-dt-text-muted">{{ t('secFilings.loading') }}</p></LedgerCard>
        <LedgerCard v-else-if="tool.filingPage.value && tool.filingPage.value.filings.length"><SecFilingList :filings="tool.filingPage.value.filings" :company="tool.selectedCompany.value" :selected="tool.selectedAccessions.value" :capture="researchCapture" @toggle="tool.toggleSelection" /><div class="mt-6 flex justify-between"><BaseButton variant="secondary" :disabled="tool.pageIndex.value === 0" @click="tool.previousPage">{{ t('secFilings.previous') }}</BaseButton><BaseButton variant="secondary" :disabled="!tool.filingPage.value.nextCursor" @click="tool.nextPage">{{ t('secFilings.next') }}</BaseButton></div></LedgerCard>
        <LedgerCard v-else class="py-16 text-center"><Icon name="heroicons:document-magnifying-glass" class="mx-auto h-12 w-12 text-dt-text-muted" /><p class="mt-4 text-dt-text-muted">{{ t('secFilings.emptyFilings') }}</p></LedgerCard>
      </template>
      <LedgerCard v-else class="py-16 text-center"><Icon name="heroicons:building-office-2" class="mx-auto h-12 w-12 text-dt-text-muted" /><p class="mt-4 text-dt-text-muted">{{ t('secFilings.initial') }}</p></LedgerCard>
    </PageContainer>
    <ResearchCaptureModal :capture="researchCapture" />
  </div>
</template>
