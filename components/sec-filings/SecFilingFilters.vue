<script setup lang="ts">
import type { SecFilingFilters } from '~/types/sec-filings'
const props = defineProps<{ modelValue: SecFilingFilters }>()
const emit = defineEmits<{ apply: [] }>()
const { t } = useI18n()
const forms = ['10-K', '10-Q', '8-K', '20-F', '6-K', '40-F']
function toggle(form: string) {
  props.modelValue.forms = props.modelValue.forms.includes(form) ? props.modelValue.forms.filter(value => value !== form) : [...props.modelValue.forms, form]
}
</script>
<template>
  <LedgerCard>
    <div class="flex flex-wrap gap-2">
      <button v-for="form in forms" :key="form" type="button" class="min-h-11 rounded-dt-pill border px-4 text-sm font-semibold" :class="modelValue.forms.includes(form) ? 'border-dt-primary-solid bg-dt-primary-solid text-white' : 'border-dt-border text-dt-text'" @click="toggle(form)">{{ form }}</button>
    </div>
    <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <label class="text-xs font-semibold text-dt-text-muted">{{ t('secFilings.filedFrom') }}<input v-model="modelValue.filedFrom" type="date" class="mt-1 min-h-11 w-full rounded-dt-sm border border-dt-border bg-dt-bg px-3 text-dt-text"></label>
      <label class="text-xs font-semibold text-dt-text-muted">{{ t('secFilings.filedTo') }}<input v-model="modelValue.filedTo" type="date" class="mt-1 min-h-11 w-full rounded-dt-sm border border-dt-border bg-dt-bg px-3 text-dt-text"></label>
      <label class="text-xs font-semibold text-dt-text-muted">{{ t('secFilings.periodFrom') }}<input v-model="modelValue.periodFrom" type="date" class="mt-1 min-h-11 w-full rounded-dt-sm border border-dt-border bg-dt-bg px-3 text-dt-text"></label>
      <label class="text-xs font-semibold text-dt-text-muted">{{ t('secFilings.amendments') }}<select v-model="modelValue.amendments" class="mt-1 min-h-11 w-full rounded-dt-sm border border-dt-border bg-dt-bg px-3 text-dt-text"><option value="include">{{ t('secFilings.include') }}</option><option value="exclude">{{ t('secFilings.exclude') }}</option><option value="only">{{ t('secFilings.only') }}</option></select></label>
      <BaseButton class="self-end" @click="emit('apply')">{{ t('secFilings.applyFilters') }}</BaseButton>
    </div>
  </LedgerCard>
</template>
