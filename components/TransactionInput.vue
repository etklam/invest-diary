<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">交易記錄</h3>
      <button
        type="button"
        @click="addTransaction"
        class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
      >
        <Icon name="heroicons:plus" class="mr-2 h-4 w-4" />
        新增交易
      </button>
    </div>

    <div v-if="transactions.length === 0" class="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
      <p class="text-sm text-gray-500 dark:text-gray-400">尚無交易記錄</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="(transaction, index) in transactions"
        :key="index"
        class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 relative"
        :class="{ 'border-red-500 dark:border-red-500': hasValidationError(transaction) }"
      >
        <button
          type="button"
          @click="removeTransaction(index)"
          class="absolute top-2 right-2 text-gray-400 hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="刪除交易"
        >
          <Icon name="heroicons:x-mark" class="h-5 w-5" />
        </button>

        <div class="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
          <div class="sm:col-span-1">
            <label :for="`symbol-${index}`" class="block text-sm sm:text-xs font-medium text-gray-700 dark:text-gray-300">代碼</label>
            <div class="mt-1">
              <input
                type="text"
                :id="`symbol-${index}`"
                :value="transaction.symbol"
                @input="updateSymbol(index, $event)"
                class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full text-base sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase min-h-[44px] px-3"
                placeholder="AAPL"
              />
            </div>
          </div>

          <div class="sm:col-span-1">
            <label :for="`type-${index}`" class="block text-sm sm:text-xs font-medium text-gray-700 dark:text-gray-300">類型</label>
            <div class="mt-1">
              <select
                :id="`type-${index}`"
                v-model="transaction.type"
                @change="validateTransaction(index)"
                class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full text-base sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white min-h-[44px] px-3"
              >
                <option value="BUY">買入</option>
                <option value="SELL">賣出</option>
              </select>
            </div>
          </div>

          <div class="sm:col-span-1">
            <label :for="`quantity-${index}`" class="block text-sm sm:text-xs font-medium text-gray-700 dark:text-gray-300">
              數量
              <span v-if="transaction.type === 'SELL' && getCurrentHolding(transaction.symbol)" class="text-xs text-gray-500 dark:text-gray-400">
                (可用: {{ formatQuantity(getCurrentHolding(transaction.symbol)) }})
              </span>
            </label>
            <div class="mt-1">
              <input
                type="number"
                :id="`quantity-${index}`"
                v-model.number="transaction.quantity"
                @input="validateTransaction(index)"
                step="0.0001"
                min="0"
                class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full text-base sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white min-h-[44px] px-3"
                :class="{ 'border-red-500 focus:border-red-500 focus:ring-red-500': getValidationError(transaction) }"
              />
            </div>
          </div>

          <div class="sm:col-span-1">
            <label :for="`price-${index}`" class="block text-sm sm:text-xs font-medium text-gray-700 dark:text-gray-300">價格</label>
            <div class="mt-1">
              <input
                type="number"
                :id="`price-${index}`"
                v-model.number="transaction.price"
                step="0.01"
                min="0"
                class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full text-base sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white min-h-[44px] px-3"
              />
            </div>
          </div>

          <div class="sm:col-span-2">
            <label :for="`date-${index}`" class="block text-sm sm:text-xs font-medium text-gray-700 dark:text-gray-300">日期時間</label>
            <div class="mt-1">
              <input
                type="datetime-local"
                :id="`date-${index}`"
                v-model="transaction.trade_date"
                class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full text-base sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white min-h-[44px] px-3"
              />
            </div>
          </div>
        </div>

        <!-- Validation Error Message -->
        <div v-if="getValidationError(transaction)" class="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center">
          <Icon name="heroicons:exclamation-triangle" class="h-4 w-4 mr-1" />
          {{ getValidationError(transaction) }}
        </div>

        <!-- 交易筆記（柔性提示，可摺疊） -->
        <div class="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          <button
            type="button"
            @click="toggleNotes(index)"
            class="flex items-center text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Icon
              :name="expandedNotes.has(index) ? 'heroicons:chevron-down' : 'heroicons:chevron-right'"
              class="h-3 w-3 mr-1"
            />
            {{ expandedNotes.has(index) ? '收起筆記' : '+ 交易筆記（選填）' }}
          </button>

          <div v-if="expandedNotes.has(index)" class="mt-3 space-y-3">
            <!-- notes -->
            <div>
              <label :for="`notes-${index}`" class="block text-xs font-medium text-gray-600 dark:text-gray-400">
                交易理由 / 心得
              </label>
              <textarea
                :id="`notes-${index}`"
                :value="transaction.notes ?? ''"
                @input="updateField(index, 'notes', ($event.target as HTMLTextAreaElement).value)"
                rows="2"
                class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 resize-none"
                placeholder="為什麼做這筆交易？執行心得..."
              />
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <!-- strategy -->
              <div>
                <label :for="`strategy-${index}`" class="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  策略標籤
                </label>
                <input
                  type="text"
                  :id="`strategy-${index}`"
                  :value="transaction.strategy ?? ''"
                  @input="updateField(index, 'strategy', ($event.target as HTMLInputElement).value)"
                  class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white min-h-[36px] px-3"
                  placeholder="如：趨勢跟隨、突破買入"
                />
              </div>

              <!-- emotion -->
              <div>
                <label :for="`emotion-${index}`" class="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  當下情緒
                </label>
                <select
                  :id="`emotion-${index}`"
                  :value="transaction.emotion ?? ''"
                  @change="updateField(index, 'emotion', ($event.target as HTMLSelectElement).value)"
                  class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white min-h-[36px] px-3"
                >
                  <option value="">選擇情緒...</option>
                  <option value="calm">😌 冷靜</option>
                  <option value="confident">💪 有信心</option>
                  <option value="uncertain">🤔 不確定</option>
                  <option value="fomo">😰 追漲（FOMO）</option>
                  <option value="fear">😨 恐懼</option>
                  <option value="greed">🤑 貪婪</option>
                </select>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Holdings Summary -->
    <div v-if="holdings.length > 0" class="bg-blue-50 dark:bg-blue-900/40 p-3 rounded-md border border-blue-200 dark:border-blue-700">
      <h4 class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">目前持股（本表）</h4>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div v-for="holding in holdings" :key="holding.symbol" class="bg-white dark:bg-gray-800 p-2 rounded">
          <span class="font-medium text-gray-900 dark:text-white">{{ holding.symbol }}</span>
          <span class="text-gray-600 dark:text-gray-400 ml-2">{{ formatQuantity(holding.quantity) }}</span>
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

  // Validate SELL transactions
  if (tx.type === 'SELL') {
    const symbol = tx.symbol?.trim()

    if (!symbol) {
      errors.push('賣出時必須輸入股票代碼')
    } else {
      // Only enforce holdings when the server-provided baseline is known.
      if (ledgerContext.value.available) {
        const available = holdingBeforeTransaction(
          transactions.value,
          index,
          ledgerContext.value,
        )

        if (available <= 0) {
          errors.push(`沒有 ${symbol} 的持股可賣`)
        } else if ((tx.quantity || 0) > available) {
          errors.push(`賣出數量 (${formatQuantity(tx.quantity)}) 超過持股數量 (${formatQuantity(available)})`)
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
