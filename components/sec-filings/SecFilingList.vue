<script setup lang="ts">
import type { SecFilingSummary } from '~/types/sec-filings'
import type { SecCompany } from '~/types/sec-filings'
import type { ResearchCaptureController } from '~/composables/useResearchCapture'
const props = defineProps<{ filings: SecFilingSummary[]; company: SecCompany; selected: string[]; capture: ResearchCaptureController }>()
const emit = defineEmits<{ toggle: [accession: string] }>()
const { t } = useI18n()

function filingUrl(filing: SecFilingSummary): string {
  const cik = (filing.cik || props.company.cik).replace(/^0+/, '') || '0'
  const accessionDirectory = filing.accession.replaceAll('-', '')
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionDirectory}/${filing.accession}-index.html`
}

function captureFiling(filing: SecFilingSummary): void {
  const ticker = props.company.tickers[0]?.trim() || undefined
  const sourceTitle = `${ticker ?? props.company.name} ${filing.form}`
  props.capture.open({
    sourceLabel: `${t('researchCapture.sources.secFiling')} · ${sourceTitle}`,
    suggestedInsight: t('researchCapture.context.secFilingObservation', { title: sourceTitle }),
    metadata: {
      sourceType: 'SEC_FILING',
      sourceTitle,
      sourceUrl: filingUrl(filing),
      occurredAt: filing.filingDate,
      metadataJson: JSON.stringify({
        cik: filing.cik || props.company.cik,
        accession: filing.accession,
        form: filing.form,
        filingDate: filing.filingDate,
        reportDate: filing.reportDate,
      }),
    },
    ...(ticker ? { symbolPrefill: ticker } : {}),
  })
}
</script>
<template>
  <div>
    <div class="hidden overflow-x-auto md:block">
      <table class="w-full text-sm"><thead><tr class="border-b border-dt-border text-left text-xs uppercase tracking-wider text-dt-text-muted"><th class="p-3">{{ t('secFilings.select') }}</th><th class="p-3">{{ t('secFilings.form') }}</th><th class="p-3">{{ t('secFilings.filingDate') }}</th><th class="p-3">{{ t('secFilings.reportPeriod') }}</th><th class="p-3">{{ t('secFilings.accession') }}</th><th class="p-3" /></tr></thead><tbody><tr v-for="filing in filings" :key="filing.accession" class="border-b border-dt-border"><td class="p-3"><input type="checkbox" :aria-label="`${filing.form} ${filing.filingDate}`" :checked="selected.includes(filing.accession)" :disabled="!selected.includes(filing.accession) && selected.length >= 10" @change="emit('toggle', filing.accession)"></td><td class="p-3"><StatusBadge :tone="filing.isAmendment ? 'warning' : 'neutral'">{{ filing.form }}</StatusBadge></td><td class="p-3 font-data">{{ filing.filingDate }}</td><td class="p-3 font-data">{{ filing.reportDate || '—' }}</td><td class="p-3 font-data text-xs">{{ filing.accession }}</td><td class="p-3"><div class="flex flex-wrap justify-end gap-x-4 gap-y-2"><a class="font-semibold text-dt-primary" :href="filingUrl(filing)" target="_blank" rel="noopener noreferrer">{{ t('secFilings.open') }}</a><button v-if="capture.canCapture.value" type="button" class="font-semibold text-dt-primary" @click="captureFiling(filing)">{{ t('researchCapture.captureInsight') }}</button></div></td></tr></tbody></table>
    </div>
    <div class="space-y-3 md:hidden"><LedgerCard v-for="filing in filings" :key="filing.accession"><div class="flex items-start justify-between gap-3"><div><StatusBadge :tone="filing.isAmendment ? 'warning' : 'neutral'">{{ filing.form }}</StatusBadge><p class="mt-3 font-data text-sm text-dt-text">{{ filing.filingDate }}</p><p class="mt-1 break-all font-data text-xs text-dt-text-muted">{{ filing.accession }}</p></div><input type="checkbox" :aria-label="`${filing.form} ${filing.filingDate}`" :checked="selected.includes(filing.accession)" :disabled="!selected.includes(filing.accession) && selected.length >= 10" @change="emit('toggle', filing.accession)"></div><div class="mt-4 flex flex-wrap gap-x-4 gap-y-2"><a class="inline-flex min-h-11 items-center font-semibold text-dt-primary" :href="filingUrl(filing)" target="_blank" rel="noopener noreferrer">{{ t('secFilings.open') }}</a><button v-if="capture.canCapture.value" type="button" class="inline-flex min-h-11 items-center font-semibold text-dt-primary" @click="captureFiling(filing)">{{ t('researchCapture.captureInsight') }}</button></div></LedgerCard></div>
  </div>
</template>
