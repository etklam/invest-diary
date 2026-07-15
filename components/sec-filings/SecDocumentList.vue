<script setup lang="ts">
import type { SecFilingDocument } from '~/types/sec-filings'
const props = defineProps<{ documents: SecFilingDocument[]; cik: string; accession: string }>()
const { t } = useI18n()
const href = (name: string) => `/api/tools/sec-filings/companies/${encodeURIComponent(props.cik)}/filings/${encodeURIComponent(props.accession)}/documents/${encodeURIComponent(name)}`
</script>
<template>
  <div class="space-y-3">
    <LedgerCard v-for="document in documents" :key="document.basename" class="!p-4">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><StatusBadge :tone="document.isPrimary ? 'accent' : document.isPdf ? 'warning' : 'neutral'">{{ t(`secFilings.documentClasses.${document.classification}`) }}</StatusBadge><span v-if="document.type" class="text-xs text-dt-text-muted">{{ document.type }}</span></div><p class="mt-2 break-all font-data text-sm font-semibold text-dt-text">{{ document.basename }}</p><p v-if="document.description" class="mt-1 break-words text-sm text-dt-text-muted">{{ document.description }}</p><p class="mt-1 font-data text-xs text-dt-text-muted">{{ Math.ceil(document.size / 1024).toLocaleString() }} KB</p></div>
        <a :href="href(document.basename)" class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-dt-sm bg-dt-primary px-4 font-semibold text-white"><Icon name="heroicons:arrow-down-tray" class="mr-2 h-4 w-4" />{{ t('secFilings.download') }}</a>
      </div>
    </LedgerCard>
  </div>
</template>
