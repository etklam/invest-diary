<template>
  <div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-12 px-6 text-center">
    <Icon name="heroicons:clock" class="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
    <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('stock.watchlist.emptyTimelineTitle') }}</p>
    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ t('stock.watchlist.emptyTimelineDescription') }}</p>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
</script>
