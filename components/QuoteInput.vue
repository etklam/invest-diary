<script setup lang="ts">
import type { QuoteResponse } from '~/lib/market-data/yahoo'
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

const { t } = useI18n()

// ponytail: primary vs relative use two semantic colors so users can
// tell the two inputs apart at a glance. Both come from the design token
// scale — no decorative palette.
const accentText = computed(() => props.isPrimary ? 'text-dt-primary' : 'text-dt-info')
const accentBorder = computed(() => props.isPrimary ? 'focus:border-dt-primary focus:ring-dt-primary/15' : 'focus:border-dt-info focus:ring-dt-info/15')
const accentBadge = computed(() => props.isPrimary ? 'bg-dt-primary-solid/10 text-dt-primary' : 'bg-dt-info/10 text-dt-info')
const accentBtn = computed(() => props.isPrimary ? 'bg-dt-primary-solid hover:opacity-90 focus:ring-dt-primary' : 'bg-dt-info hover:opacity-90 focus:ring-dt-info')
const inputId = computed(() => props.isPrimary ? 'primary' : 'relative')
</script>

<template>
  <div
    class="group relative overflow-hidden rounded-dt-md border border-dt-border bg-dt-surface p-6 transition-colors duration-200 hover:border-dt-border-strong"
  >
    <div class="relative">
      <div class="mb-4 flex items-center justify-between">
        <label
          :for="`${inputId}-symbol`"
          class="flex items-center gap-2 text-sm font-semibold text-dt-text"
        >
          <Icon :name="isPrimary ? 'heroicons:chart-bar-square' : 'heroicons:scale'" class="h-4 w-4" :class="accentText" />
          {{ isPrimary ? t('tools.relativeValue.primaryStock') : t('tools.relativeValue.relativeStock') }}
        </label>
        <span
          class="rounded-dt-pill px-2 py-1 text-xs font-medium"
          :class="accentBadge"
        >
          {{ isPrimary ? 'Primary' : 'Relative' }}
        </span>
      </div>
      <div class="space-y-4">
        <div>
          <label :for="`${inputId}-symbol`" class="mb-1.5 block text-xs font-medium text-dt-text-soft">
            {{ t('tools.relativeValue.symbol') }}
          </label>
          <div class="relative">
            <input
              :id="`${inputId}-symbol`"
              v-model="symbol"
              type="text"
              :placeholder="t('tools.relativeValue.symbolPlaceholder')"
              class="w-full rounded-dt-sm border border-dt-border bg-dt-surface-strong px-4 py-3 pr-24 text-sm font-medium text-dt-text placeholder:text-dt-text-soft transition-colors duration-200 focus:bg-dt-surface focus:outline-none focus:ring-4"
              :class="accentBorder"
              @keyup.enter="emit('fetchQuote')"
            >
            <button
              type="button"
              :disabled="!symbol.trim() || loading"
              :data-testid="isPrimary ? 'primary-quote-button' : 'relative-quote-button'"
              :aria-label="t('tools.relativeValue.fetchQuote')"
              class="absolute right-2 top-1/2 -translate-y-1/2 rounded-dt-sm px-3 py-1.5 min-h-[44px] text-xs font-semibold text-white transition-opacity duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              :class="accentBtn"
              @click="emit('fetchQuote')"
            >
              <Icon :name="loading ? 'heroicons:arrow-path' : 'heroicons:arrow-down-tray'" class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            </button>
          </div>
          <p v-if="symbolSuggestion" class="mt-2 text-xs text-dt-warning">
            {{ t('tools.relativeValue.aliasSuggestion') }} <span class="font-mono font-semibold">{{ symbolSuggestion }}</span>
          </p>
          <p v-if="error" class="mt-2 text-xs text-dt-danger">
            {{ error }}
          </p>
        </div>
        <div>
          <label :for="`${inputId}-price`" class="mb-1.5 block text-xs font-medium text-dt-text-soft">
            {{ t('tools.relativeValue.price') }}
          </label>
          <div class="relative">
            <input
              :id="`${inputId}-price`"
              v-model.number="priceValue"
              type="number"
              min="0"
              step="0.01"
              :placeholder="t('tools.relativeValue.pricePlaceholder')"
              class="w-full rounded-dt-sm border border-dt-border bg-dt-surface-strong px-4 py-3 pl-10 text-sm font-mono font-medium text-dt-text placeholder:text-dt-text-soft transition-colors duration-200 focus:bg-dt-surface focus:outline-none focus:ring-4"
              :class="accentBorder"
            >
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-dt-text-soft">$</span>
          </div>
        </div>
      </div>
      <!-- Live Quote Display -->
      <div v-if="quote" class="mt-4 flex items-center gap-3 rounded-dt-sm border border-dt-border bg-dt-surface-strong p-3">
        <div class="flex-1">
          <div class="text-xs font-medium text-dt-text-soft">
            {{ t('tools.relativeValue.currentPrice') }}
          </div>
          <div class="text-lg font-mono font-bold text-dt-text">
            ${{ formatPrice(quote.regularMarketPrice) }}
          </div>
        </div>
        <div class="text-right">
          <div
            class="text-sm font-mono font-semibold"
            :class="quote.change >= 0 ? 'text-dt-success' : 'text-dt-danger'"
          >
            {{ quote.change >= 0 ? '+' : '' }}{{ quote.change.toFixed(2) }}
          </div>
          <div
            class="text-xs font-medium"
            :class="quote.changePercent >= 0 ? 'text-dt-success' : 'text-dt-danger'"
          >
            {{ quote.changePercent >= 0 ? '+' : '' }}{{ quote.changePercent.toFixed(2) }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
