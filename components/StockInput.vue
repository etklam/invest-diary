<script setup lang="ts">
import type { QuoteResponse } from '~/lib/yahoo-finance'
import { formatPrice } from '~/lib/relativeValue'

const props = defineProps<{
  modelValue: string
  price: number | null
  loading: boolean
  error: string
  quote: QuoteResponse | null
  symbolSuggestion: string | null
  isPrimary: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:price': [value: number | null]
  fetchQuote: []
}>()

const symbol = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value.toUpperCase()),
})

const priceValue = computed({
  get: () => props.price,
  set: (value) => emit('update:price', value),
})

const colorClass = computed(() => props.isPrimary ? 'amber' : 'violet')

const { t } = useI18n()
</script>

<template>
  <div
    class="group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/80 p-6 backdrop-blur-sm transition-all duration-200 hover:shadow-xl dark:border-slate-700/60 dark:bg-slate-800/60"
    :class="[
      isPrimary ? 'hover:border-amber-500/30 hover:shadow-amber-500/5 dark:hover:border-amber-500/20' : 'hover:border-violet-500/30 hover:shadow-violet-500/5 dark:hover:border-violet-500/20'
    ]"
  >
    <div
      class="absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl transition-colors duration-300"
      :class="[
        isPrimary ? 'bg-amber-500/5 group-hover:bg-amber-500/10' : 'bg-violet-500/5 group-hover:bg-violet-500/10'
      ]"
    />
    <div class="relative">
      <div class="mb-4 flex items-center justify-between">
        <label
          :for="`${colorClass}-symbol`"
          class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          <Icon :name="isPrimary ? 'heroicons:chart-bar-square' : 'heroicons:scale'" class="h-4 w-4" :class="`text-${colorClass}-500`" />
          {{ isPrimary ? t('tools.relativeValue.primaryStock') : t('tools.relativeValue.relativeStock') }}
        </label>
        <span
          class="rounded-full px-2 py-1 text-xs font-medium"
          :class="`bg-${colorClass}-500/10 text-${colorClass}-600 dark:text-${colorClass}-400`"
        >
          {{ isPrimary ? 'Primary' : 'Relative' }}
        </span>
      </div>
      <div class="space-y-4">
        <div>
          <label :for="`${colorClass}-symbol`" class="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            {{ t('tools.relativeValue.symbol') }}
          </label>
          <div class="relative">
            <input
              :id="`${colorClass}-symbol`"
              v-model="symbol"
              type="text"
              :placeholder="t('tools.relativeValue.symbolPlaceholder')"
              class="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 pr-24 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-4 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white"
              :class="`focus:border-${colorClass}-500 focus:ring-${colorClass}-500/10 dark:focus:border-${colorClass}-500 dark:focus:ring-${colorClass}-500/20`"
              @keyup.enter="emit('fetchQuote')"
            >
            <button
              type="button"
              :disabled="!symbol.trim() || loading"
              :data-testid="isPrimary ? 'primary-quote-button' : 'relative-quote-button'"
              class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900"
              :class="`bg-${colorClass}-500 hover:bg-${colorClass}-600 focus:ring-${colorClass}-500`"
              @click="emit('fetchQuote')"
            >
              <Icon :name="loading ? 'heroicons:arrow-path' : 'heroicons:arrow-down-tray'" class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            </button>
          </div>
          <p v-if="symbolSuggestion" class="mt-2 text-xs text-amber-600 dark:text-amber-400">
            {{ t('tools.relativeValue.aliasSuggestion') }} <span class="font-mono font-semibold">{{ symbolSuggestion }}</span>
          </p>
          <p v-if="error" class="mt-2 text-xs text-rose-600 dark:text-rose-400">
            {{ error }}
          </p>
        </div>
        <div>
          <label :for="`${colorClass}-price`" class="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            {{ t('tools.relativeValue.price') }}
          </label>
          <div class="relative">
            <input
              :id="`${colorClass}-price`"
              v-model.number="priceValue"
              type="number"
              min="0"
              step="0.01"
              :placeholder="t('tools.relativeValue.pricePlaceholder')"
              class="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 pl-10 text-sm font-mono font-medium text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:bg-white focus:outline-none focus:ring-4 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white"
              :class="`focus:border-${colorClass}-500 focus:ring-${colorClass}-500/10 dark:focus:border-${colorClass}-500 dark:focus:ring-${colorClass}-500/20`"
            >
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">$</span>
          </div>
        </div>
      </div>
      <!-- Live Quote Display -->
      <div v-if="quote" class="mt-4 flex items-center gap-3 rounded-xl bg-slate-50/80 p-3 dark:bg-slate-900/60">
        <div class="flex-1">
          <div class="text-xs font-medium text-slate-500 dark:text-slate-400">
            {{ t('tools.relativeValue.currentPrice') }}
          </div>
          <div class="text-lg font-mono font-bold text-slate-900 dark:text-white">
            ${{ formatPrice(quote.regularMarketPrice) }}
          </div>
        </div>
        <div class="text-right">
          <div
            class="text-sm font-mono font-semibold"
            :class="quote.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ quote.change >= 0 ? '+' : '' }}{{ quote.change.toFixed(2) }}
          </div>
          <div
            class="text-xs font-medium"
            :class="quote.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ quote.changePercent >= 0 ? '+' : '' }}{{ quote.changePercent.toFixed(2) }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
