<template>
  <form class="flex flex-col sm:flex-row gap-2" @submit.prevent="submit">
    <input
      v-model="symbol"
      type="text"
      :placeholder="t('stock.watchlist.symbolPlaceholder')"
      class="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm uppercase"
      maxlength="32"
    >
    <button
      type="submit"
      :disabled="loading"
      class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold"
    >
      <Icon :name="loading ? 'svg-spinners:180-ring-with-bg' : 'heroicons:plus'" class="w-4 h-4" />
      {{ t('stock.watchlist.add') }}
    </button>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [symbol: string]
}>()

const { t } = useI18n()
const symbol = ref('')

const submit = () => {
  const normalized = symbol.value.trim().toUpperCase()
  if (!normalized || props.loading) return
  emit('submit', normalized)
  symbol.value = ''
}
</script>
