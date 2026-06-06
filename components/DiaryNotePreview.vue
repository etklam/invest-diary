<script setup lang="ts">
withDefaults(
  defineProps<{
    date?: string
    tag?: string
    title?: string
    thesis?: string
    risk?: string
    reviewIn?: string
  }>(),
  {
    date: '2026-06-06',
    tag: 'Swing',
    title: 'NVDA breakout above 135',
    thesis: 'Earnings momentum + data center CapEx cycle. Volume confirming.',
    risk: 'Stop at 128.50, max 3% position.',
    reviewIn: '5 trading days',
  }
)
</script>

<template>
  <LedgerCard>
    <div class="space-y-4">
      <!-- Header row: date + tag -->
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-medium tracking-wide text-dt-text-muted font-[family-name:var(--font-data)]">
          {{ date }}
        </span>
        <StatusBadge tone="accent">
          {{ tag }}
        </StatusBadge>
      </div>

      <!-- Title -->
      <h3 class="text-base font-semibold leading-snug text-dt-text">
        {{ title }}
      </h3>

      <!-- Fields -->
      <div class="space-y-2 text-sm">
        <div v-if="thesis" class="flex flex-col gap-0.5">
          <span class="text-xs font-semibold uppercase tracking-wider text-dt-text-muted">Thesis</span>
          <span class="text-dt-text leading-relaxed">{{ thesis }}</span>
        </div>
        <div class="h-px bg-dt-border" />
        <div v-if="risk" class="flex flex-col gap-0.5">
          <span class="text-xs font-semibold uppercase tracking-wider text-dt-text-muted">Risk</span>
          <span class="text-dt-text leading-relaxed">{{ risk }}</span>
        </div>
        <div class="h-px bg-dt-border" />
        <div v-if="reviewIn" class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-dt-text-muted">Review in</span>
          <span class="text-xs font-semibold text-dt-primary">{{ reviewIn }}</span>
        </div>
      </div>
    </div>
  </LedgerCard>
</template>
