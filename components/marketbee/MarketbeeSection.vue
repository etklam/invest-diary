<script setup lang="ts">
import { useMarketbee } from '~/composables/useMarketbee'

const { snapshot, loading, error, refresh } = useMarketbee()
</script>

<template>
  <section class="space-y-4" aria-label="Marketbee Regime Monitor">
    <div v-if="loading && !snapshot" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div class="flex items-center gap-3">
        <Icon name="heroicons:arrow-path" class="h-5 w-5 animate-spin text-indigo-500" />
        <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Loading Marketbee snapshot...
        </p>
      </div>
    </div>

    <div v-else-if="error && !snapshot" class="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-400/20 dark:bg-rose-400/10">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <p class="text-sm font-black text-rose-900 dark:text-rose-100">
            Marketbee snapshot unavailable
          </p>
          <p class="mt-1 text-sm text-rose-700 dark:text-rose-200">
            {{ error }}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
          @click="refresh"
        >
          <Icon name="heroicons:arrow-path" class="h-4 w-4" />
          Retry
        </button>
      </div>
    </div>

    <template v-if="snapshot">
      <MarketRegimeCard
        :regime="snapshot.regime"
        :score="snapshot.score"
        :suggested-exposure="snapshot.suggestedExposure"
        :date="snapshot.date"
        :is-stale="snapshot.isStale"
      />
      <BreadthSnapshotGrid
        :up4="snapshot.up4"
        :down4="snapshot.down4"
        :up4-pct="snapshot.up4Pct"
        :down4-pct="snapshot.down4Pct"
        :ratio10d="snapshot.ratio10d"
        :above40d-pct="snapshot.above40dPct"
      />
      <BetaExposureGuide :message="snapshot.message" :regime="snapshot.regime" />
    </template>
  </section>
</template>
