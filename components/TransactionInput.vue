<template>
  <div class="space-y-4">
    <div v-if="transactions.length === 0" class="rounded-dt-sm border border-dashed border-dt-border bg-dt-surface-strong py-8 text-center">
      <p class="text-sm text-dt-text-muted">{{ t('diary.form.noTransactions') }}</p>
      <BaseButton variant="secondary" class="mt-3" @click="addTransaction">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        {{ t('diary.form.addTransaction') }}
      </BaseButton>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="(transaction, index) in transactions"
        :key="index"
        class="relative rounded-dt-sm border bg-dt-surface-strong p-4"
        :class="hasValidationError(transaction) ? 'border-dt-danger' : 'border-dt-border'"
      >
        <button
          type="button"
          @click="removeTransaction(index)"
          class="absolute right-1 top-1 flex min-h-[44px] min-w-[44px] items-center justify-center text-dt-text-soft transition-colors hover:text-dt-danger"
          :aria-label="t('diary.form.removeTransaction')"
        >
          <Icon name="heroicons:x-mark" class="h-5 w-5" />
        </button>

        <div class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-6">
          <div class="sm:col-span-1">
            <label :for="`symbol-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.symbol') }}</label>
            <input
              type="text"
              :id="`symbol-${index}`"
              :value="transaction.symbol"
              @input="updateSymbol(index, $event)"
              :class="inputClass"
              class="uppercase"
              placeholder="AAPL"
            />
          </div>

          <div class="sm:col-span-1">
            <label :for="`type-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.type') }}</label>
            <select
              :id="`type-${index}`"
              v-model="transaction.type"
              @change="validateTransaction(index)"
              :class="inputClass"
            >
              <option value="BUY">{{ t('diary.form.buy') }}</option>
              <option value="SELL">{{ t('diary.form.sell') }}</option>
            </select>
          </div>

          <div class="sm:col-span-1">
            <label :for="`quantity-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
              {{ t('diary.form.quantity') }}
              <span v-if="transaction.type === 'SELL' && getCurrentHolding(transaction.symbol)" class="font-mono text-[11px] normal-case tracking-normal text-dt-text-soft">
                ({{ t('diary.form.available') }} {{ formatQuantity(getCurrentHolding(transaction.symbol)) }})
              </span>
            </label>
            <input
              type="number"
              :id="`quantity-${index}`"
              v-model.number="transaction.quantity"
              @input="validateTransaction(index)"
              step="0.0001"
              min="0.0001"
              :class="[inputClass, getValidationError(transaction) ? 'border-dt-danger focus:border-dt-danger' : '']"
              class="font-mono"
            />
          </div>

          <div class="sm:col-span-1">
            <label :for="`price-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.price') }}</label>
            <input
              type="number"
              :id="`price-${index}`"
              v-model.number="transaction.price"
              @input="validateTransaction(index)"
              step="0.01"
              min="0.0001"
              :class="inputClass"
              class="font-mono"
            />
          </div>

          <div class="sm:col-span-2">
            <label :for="`date-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.dateTime') }}</label>
            <input
              type="datetime-local"
              :id="`date-${index}`"
              v-model="transaction.trade_date"
              :class="inputClass"
              class="font-mono"
            />
          </div>
        </div>

        <!-- Validation Error Message -->
        <div v-if="getValidationError(transaction)" class="mt-3 flex items-center text-sm text-dt-danger">
          <Icon name="heroicons:exclamation-triangle" class="mr-1 h-4 w-4" />
          {{ getValidationError(transaction) }}
        </div>

        <!-- 交易筆記（柔性提示，可摺疊） -->
        <div class="mt-3 border-t border-dt-border pt-3">
          <button
            type="button"
            @click="toggleNotes(index)"
            class="flex items-center text-xs text-dt-text-muted transition-colors hover:text-dt-primary"
          >
            <Icon
              :name="expandedNotes.has(index) ? 'heroicons:chevron-down' : 'heroicons:chevron-right'"
              class="mr-1 h-3 w-3"
            />
            {{ expandedNotes.has(index) ? t('diary.form.notesToggleOpen') : t('diary.form.notesToggle') }}
          </button>

          <div v-if="expandedNotes.has(index)" class="mt-3 space-y-3">
            <!-- notes -->
            <div>
              <label :for="`notes-${index}`" class="block text-xs font-medium text-dt-text-muted">
                {{ t('diary.form.notes') }}
              </label>
              <textarea
                :id="`notes-${index}`"
                :value="transaction.notes ?? ''"
                @input="updateField(index, 'notes', ($event.target as HTMLTextAreaElement).value)"
                rows="2"
                class="mt-1 block w-full resize-none rounded-dt-sm border border-dt-border bg-dt-surface px-3 py-2 text-sm text-dt-text focus:border-dt-primary focus:outline-none"
                :placeholder="t('diary.form.notesPlaceholder')"
              />
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <!-- strategy -->
              <div>
                <label :for="`strategy-${index}`" class="block text-xs font-medium text-dt-text-muted">
                  {{ t('diary.form.strategy') }}
                </label>
                <input
                  type="text"
                  :id="`strategy-${index}`"
                  :value="transaction.strategy ?? ''"
                  @input="updateField(index, 'strategy', ($event.target as HTMLInputElement).value)"
                  :class="inputClass"
                  :placeholder="t('diary.form.strategyPlaceholder')"
                />
              </div>

              <!-- emotion -->
              <div>
                <label :for="`emotion-${index}`" class="block text-xs font-medium text-dt-text-muted">
                  {{ t('diary.form.emotion') }}
                </label>
                <select
                  :id="`emotion-${index}`"
                  :value="transaction.emotion ?? ''"
                  @change="updateField(index, 'emotion', ($event.target as HTMLSelectElement).value)"
                  :class="inputClass"
                >
                  <option value="">{{ t('diary.form.emotionSelect') }}</option>
                  <option value="calm">{{ t('diary.form.emotionCalm') }}</option>
                  <option value="confident">{{ t('diary.form.emotionConfident') }}</option>
                  <option value="uncertain">{{ t('diary.form.emotionUncertain') }}</option>
                  <option value="fomo">{{ t('diary.form.emotionFomo') }}</option>
                  <option value="fear">{{ t('diary.form.emotionFear') }}</option>
                  <option value="greed">{{ t('diary.form.emotionGreed') }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div class="flex justify-end">
        <BaseButton variant="secondary" @click="addTransaction">
          <Icon name="heroicons:plus" class="h-4 w-4" />
          {{ t('diary.form.addTransaction') }}
        </BaseButton>
      </div>
    </div>

    <!-- Holdings Summary -->
    <div v-if="holdings.length > 0" class="rounded-dt-sm border border-dt-border bg-dt-surface-strong p-3">
      <h4 class="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.holdingsThisTable') }}</h4>
      <div class="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div v-for="holding in holdings" :key="holding.symbol" class="rounded-dt-sm border border-dt-border bg-dt-surface p-2">
          <span class="font-semibold text-dt-text">{{ holding.symbol }}</span>
          <span class="ml-2 font-mono text-dt-text-muted">{{ formatQuantity(holding.quantity) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  calculateLedgerHoldings,
  holdingBeforeTransaction,
  validateTransactionValues,
} from '~/lib/diary-authoring/validation'
import type {
  DiaryAuthoringLedgerContext,
  DiaryAuthoringTransaction,
} from '~/lib/diary-authoring/types'

type Transaction = DiaryAuthoringTransaction

interface Holding {
  symbol: string
  quantity: number
}

const props = defineProps<{
  modelValue: Transaction[]
  ledgerContext?: DiaryAuthoringLedgerContext
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Transaction[]): void
}>()

const { t } = useI18n()

const inputClass = 'mt-1 block w-full min-h-[44px] rounded-dt-sm border border-dt-border bg-dt-surface px-3 text-sm text-dt-text focus:border-dt-primary focus:outline-none'

const transactions = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Validation errors map
const validationErrors = ref<Map<number, string>>(new Map())

// 展開交易筆記的索引集合
const expandedNotes = ref<Set<number>>(new Set())

const toggleNotes = (index: number) => {
  if (expandedNotes.value.has(index)) {
    expandedNotes.value.delete(index)
  } else {
    expandedNotes.value.add(index)
  }
  // trigger reactivity
  expandedNotes.value = new Set(expandedNotes.value)
}

// 更新指定欄位（通用，用於 notes/strategy/emotion）
const updateField = (index: number, field: 'notes' | 'strategy' | 'emotion', value: string) => {
  const tx = transactions.value[index]
  if (!tx) return
  ;(tx as any)[field] = value || undefined
}

// A missing context means the portfolio baseline is unknown, not empty.
const ledgerContext = computed<DiaryAuthoringLedgerContext>(() => (
  props.ledgerContext ?? { available: false }
))

const calculateHoldings = (): Holding[] => {
  if (!ledgerContext.value.available) return []

  try {
    return Array.from(calculateLedgerHoldings(
      ledgerContext.value.holdings,
      transactions.value,
    ).entries())
      .filter(([, quantity]) => quantity > 0.0001)
      .map(([symbol, quantity]) => ({ symbol, quantity }))
  } catch {
    // The server remains the authority for invalid ledgers. The component
    // should not turn an unknown/legacy baseline into a false blocking error.
    return []
  }
}

// Holdings for display
const holdings = computed(() => calculateHoldings())

// Get current holding for a symbol
const getCurrentHolding = (symbol: string): number => {
  const holding = holdings.value.find(h => h.symbol === symbol?.trim())
  return holding ? holding.quantity : 0
}

// Format quantity for display
const formatQuantity = (qty: number | string | undefined): string => {
  const num = typeof qty === 'string' ? parseFloat(qty) : (qty || 0)
  if (isNaN(num)) return '0'
  return num.toFixed(4).replace(/\.?0+$/, '')
}

// Validate a single transaction
const validateTransaction = (index: number) => {
  const tx = transactions.value[index]
  if (!tx) return

  const errors: string[] = []

  const valueError = validateTransactionValues([tx], { requirePrice: true })
  if (valueError) errors.push(t('diary.form.positiveNumber'))

  // Validate SELL transactions
  if (errors.length === 0 && tx.type === 'SELL') {
    const symbol = tx.symbol?.trim()

    if (!symbol) {
      errors.push(t('diary.form.sellNeedsSymbol'))
    } else {
      // Only enforce holdings when the server-provided baseline is known.
      if (ledgerContext.value.available) {
        const available = holdingBeforeTransaction(
          transactions.value,
          index,
          ledgerContext.value,
        )

        if (available <= 0) {
          errors.push(t('diary.form.sellNoHolding', { symbol }))
        } else if ((tx.quantity || 0) > available) {
          errors.push(t('diary.form.sellExceeds', {
            qty: formatQuantity(tx.quantity),
            available: formatQuantity(available),
          }))
        }
      }
    }
  }

  if (errors.length > 0) {
    const firstError = errors[0]
    if (firstError) {
      validationErrors.value.set(index, firstError)
    }
  } else {
    validationErrors.value.delete(index)
  }
}

// Check if transaction has validation error
const hasValidationError = (tx: Transaction): boolean => {
  const index = transactions.value.indexOf(tx)
  return validationErrors.value.has(index)
}

// Get validation error message
const getValidationError = (tx: Transaction): string | undefined => {
  const index = transactions.value.indexOf(tx)
  return validationErrors.value.get(index)
}

const addTransaction = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())

  transactions.value.push({
    symbol: '',
    type: 'BUY',
    quantity: 0,
    price: 0,
    trade_date: now.toISOString().slice(0, 16),
  })
}

const removeTransaction = (index: number) => {
  transactions.value.splice(index, 1)
  // Clear validation error and revalidate remaining transactions
  validationErrors.value.delete(index)
  // Clear notes expanded state for this index
  expandedNotes.value.delete(index)
  expandedNotes.value = new Set(expandedNotes.value)
  // Revalidate all SELL transactions after removing one
  transactions.value.forEach((_, idx) => {
    const tx = transactions.value[idx]
    if (tx?.type === 'SELL') {
      validateTransaction(idx)
    }
  })
}

// Watch for changes and validate SELL transactions
watch(transactions, (newTxns) => {
  newTxns.forEach((tx, index) => {
    if (tx.type === 'SELL') {
      validateTransaction(index)
    }
  })
}, { deep: true })

// Update symbol and convert to uppercase and trim
const updateSymbol = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value.trim().toUpperCase()
  const tx = transactions.value[index]
  if (!tx) return
  tx.symbol = value
  validateTransaction(index)
}
</script>
