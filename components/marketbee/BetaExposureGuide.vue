<script setup lang="ts">
const props = defineProps<{
  message: string
  regime: string
}>()

const guideClass = computed(() => {
  if (props.regime === 'BULLISH_THRUST' || props.regime === 'RISK_ON') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100'
  }
  if (props.regime === 'NEUTRAL') {
    return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100'
  }
  if (props.regime === 'RISK_OFF') {
    return 'border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-100'
  }
  if (props.regime === 'CAPITULATION_WATCH') {
    return 'border-red-200 bg-red-50 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100'
  }
  return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
})
</script>

<template>
  <section class="rounded-2xl border p-4 shadow-sm" :class="guideClass">
    <div class="flex gap-3">
      <Icon name="heroicons:information-circle" class="mt-0.5 h-5 w-5 shrink-0" />
      <div class="min-w-0">
        <h3 class="text-sm font-black uppercase tracking-[0.08em]">
          Beta Exposure Guide
        </h3>
        <p class="mt-1 text-sm leading-6">
          {{ message || 'No exposure guidance available.' }}
        </p>
      </div>
    </div>
  </section>
</template>
