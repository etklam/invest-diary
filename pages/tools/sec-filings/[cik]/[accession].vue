<script setup lang="ts">
import { useSecFilingsTool } from '~/composables/useSecFilingsTool'
const route = useRoute()
const { t, locale } = useI18n()
const tool = useSecFilingsTool()
const cik = computed(() => String(route.params.cik ?? ''))
const accession = computed(() => String(route.params.accession ?? ''))
onMounted(() => { void tool.loadDetail(cik.value, accession.value) })
const packageHref = computed(() => `/api/tools/sec-filings/companies/${encodeURIComponent(cik.value)}/filings/${encodeURIComponent(accession.value)}/package?include=all`)
useHead(() => ({ title: `${tool.detail.value?.filing.form ?? t('secFilings.title')} - ${t('secFilings.title')}`, meta: [{ name: 'description', content: t('secFilings.detailSubtitle') }, { property: 'og:locale', content: locale.value }] }))
definePageMeta({ requiresAuth: false })
</script>
<template>
  <div class="min-h-screen bg-dt-bg"><PageContainer width="wide" class="space-y-6 py-6">
    <NuxtLink to="/tools/sec-filings" class="inline-flex min-h-11 items-center text-sm font-semibold text-dt-primary"><Icon name="heroicons:arrow-left" class="mr-2 h-4 w-4" />{{ t('secFilings.back') }}</NuxtLink>
    <LedgerCard v-if="tool.loading.value" class="py-16 text-center"><Icon name="heroicons:arrow-path" class="mx-auto h-8 w-8 animate-spin text-dt-primary" /></LedgerCard>
    <div v-else-if="tool.errorCode.value" class="rounded-dt-md border border-dt-danger/40 bg-dt-danger/10 p-4 text-dt-danger">{{ t(`error.code.${tool.errorCode.value.toLowerCase()}`) }}</div>
    <template v-else-if="tool.detail.value">
      <LedgerCard class="!p-6 sm:!p-8"><div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"><div><p class="text-xs font-bold uppercase tracking-wider text-dt-secondary">{{ tool.detail.value.company.name }}</p><div class="mt-3 flex flex-wrap items-center gap-3"><h1 class="font-display text-3xl font-semibold text-dt-text">{{ tool.detail.value.filing.form }}</h1><StatusBadge v-if="tool.detail.value.filing.isAmendment" tone="warning">{{ t('secFilings.amendment') }}</StatusBadge></div><p class="mt-3 font-data text-sm text-dt-text-muted">{{ tool.detail.value.filing.accession }}</p><p class="mt-2 text-sm text-dt-text-muted">{{ t('secFilings.filed') }} {{ tool.detail.value.filing.filingDate }} · {{ t('secFilings.reportPeriod') }} {{ tool.detail.value.filing.reportDate || '—' }}</p></div><a :href="packageHref" class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-dt-sm bg-dt-primary-solid px-5 font-semibold text-white"><Icon name="heroicons:archive-box-arrow-down" class="mr-2 h-5 w-5" />{{ t('secFilings.downloadZip') }}</a></div></LedgerCard>
      <div v-if="tool.stale.value" class="rounded-dt-md border border-dt-warning/40 bg-dt-warning/10 p-4 text-sm text-dt-warning">{{ t('secFilings.stale') }}</div>
      <LedgerCard v-if="!tool.detail.value.hasPdf" class="!p-4"><p class="text-sm text-dt-text-muted">{{ t('secFilings.noPdf') }}</p></LedgerCard>
      <section><h2 class="mb-4 text-xl font-semibold text-dt-text">{{ t('secFilings.documents', { count: tool.detail.value.documents.length }) }}</h2><SecDocumentList :documents="tool.detail.value.documents" :cik="cik" :accession="accession" /></section>
    </template>
  </PageContainer></div>
</template>
