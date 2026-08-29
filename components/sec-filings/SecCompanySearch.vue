<script setup lang="ts">
import type { SecCompanySearchResult } from '~/types/sec-filings'

defineProps<{ results: SecCompanySearchResult[]; loading: boolean }>()
const emit = defineEmits<{ search: [query: string]; select: [company: SecCompanySearchResult] }>()
const { t } = useI18n()
const query = ref('')
const hydrated = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
watch(query, value => { clearTimeout(timer); timer = setTimeout(() => emit('search', value), 250) })
onMounted(() => { hydrated.value = true })
</script>

<template>
  <div class="relative">
    <label for="sec-company-search" class="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-dt-text-muted">{{ t('secFilings.searchLabel') }}</label>
    <div class="relative">
      <input id="sec-company-search" v-model="query" type="search" autocomplete="off" :placeholder="t('secFilings.searchPlaceholder')" class="min-h-12 w-full rounded-dt-md border border-dt-border bg-dt-bg px-4 pr-12 text-dt-text focus:border-dt-primary focus:outline-none" role="combobox" :aria-expanded="results.length > 0" :data-hydrated="hydrated">
      <Icon v-if="loading" name="heroicons:arrow-path" class="absolute right-4 top-3.5 h-5 w-5 animate-spin text-dt-primary" />
      <Icon v-else name="heroicons:magnifying-glass" class="absolute right-4 top-3.5 h-5 w-5 text-dt-text-muted" />
    </div>
    <ul v-if="results.length" class="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-dt-md border border-dt-border bg-dt-surface p-2 shadow-dt-lg" role="listbox">
      <li v-for="company in results" :key="company.cik">
        <button type="button" class="flex min-h-12 w-full items-center justify-between gap-4 rounded-dt-sm px-3 py-2 text-left hover:bg-dt-surface-strong" @click="emit('select', company)">
          <span class="min-w-0"><strong class="block truncate text-dt-text">{{ company.name }}</strong><span class="text-xs text-dt-text-muted">CIK {{ company.cik }}</span></span>
          <span class="shrink-0 font-data text-sm text-dt-primary">{{ company.tickers.join(', ') }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
