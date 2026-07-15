<script setup lang="ts">
import type { SecFilingSummary } from '~/types/sec-filings'
defineProps<{ filings: SecFilingSummary[]; cik: string; selected: string[] }>()
const emit = defineEmits<{ toggle: [accession: string] }>()
const { t } = useI18n()
</script>
<template>
  <div>
    <div class="hidden overflow-x-auto md:block">
      <table class="w-full text-sm"><thead><tr class="border-b border-dt-border text-left text-xs uppercase tracking-wider text-dt-text-muted"><th class="p-3">{{ t('secFilings.select') }}</th><th class="p-3">{{ t('secFilings.form') }}</th><th class="p-3">{{ t('secFilings.filingDate') }}</th><th class="p-3">{{ t('secFilings.reportPeriod') }}</th><th class="p-3">{{ t('secFilings.accession') }}</th><th class="p-3" /></tr></thead><tbody><tr v-for="filing in filings" :key="filing.accession" class="border-b border-dt-border"><td class="p-3"><input type="checkbox" :checked="selected.includes(filing.accession)" :disabled="!selected.includes(filing.accession) && selected.length >= 10" @change="emit('toggle', filing.accession)"></td><td class="p-3"><StatusBadge :tone="filing.isAmendment ? 'warning' : 'neutral'">{{ filing.form }}</StatusBadge></td><td class="p-3 font-data">{{ filing.filingDate }}</td><td class="p-3 font-data">{{ filing.reportDate || '—' }}</td><td class="p-3 font-data text-xs">{{ filing.accession }}</td><td class="p-3 text-right"><NuxtLink class="font-semibold text-dt-primary" :to="`/tools/sec-filings/${cik}/${filing.accession}`">{{ t('secFilings.open') }}</NuxtLink></td></tr></tbody></table>
    </div>
    <div class="space-y-3 md:hidden"><LedgerCard v-for="filing in filings" :key="filing.accession"><div class="flex items-start justify-between gap-3"><div><StatusBadge :tone="filing.isAmendment ? 'warning' : 'neutral'">{{ filing.form }}</StatusBadge><p class="mt-3 font-data text-sm text-dt-text">{{ filing.filingDate }}</p><p class="mt-1 break-all font-data text-xs text-dt-text-muted">{{ filing.accession }}</p></div><input type="checkbox" :checked="selected.includes(filing.accession)" :disabled="!selected.includes(filing.accession) && selected.length >= 10" @change="emit('toggle', filing.accession)"></div><NuxtLink class="mt-4 inline-flex min-h-11 items-center font-semibold text-dt-primary" :to="`/tools/sec-filings/${cik}/${filing.accession}`">{{ t('secFilings.open') }}</NuxtLink></LedgerCard></div>
  </div>
</template>
