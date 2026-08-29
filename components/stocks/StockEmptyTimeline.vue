<template>
  <div class="rounded-xl border border-dashed border-dt-border py-12 px-6 text-center">
    <Icon name="heroicons:clock" class="w-10 h-10 mx-auto mb-3 text-dt-text-muted" />
    <p class="text-sm font-semibold text-dt-text">{{ t('stock.watchlist.emptyTimelineTitle') }}</p>
    <p class="text-xs text-dt-text-soft mt-1">{{ t('stock.watchlist.emptyTimelineDescription') }}</p>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
</script>
