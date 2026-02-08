<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">交易記錄</h3>
      <button
        type="button"
        @click="addTransaction"
        class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
          class="absolute top-2 right-2 text-gray-400 hover:text-red-500"
        >
          <Icon name="heroicons:x-mark" class="h-5 w-5" />
        </button>

        <div class="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
          <div class="sm:col-span-1">
            <label :for="`symbol-${index}`" class="block text-xs font-medium text-gray-700 dark:text-gray-300">代碼</label>
            <div class="mt-1">
              <input
                type="text"
                :id="`symbol-${index}`"
                :value="transaction.symbol"
                @input="updateSymbol(index, $event)"
                class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase"
                placeholder="AAPL"
              />
            </div>
          </div>

          <div class="sm:col-span-1">
            <label :for="`type-${index}`" class="block text-xs font-medium text-gray-700 dark:text-gray-300">類型</label>
            <div class="mt-1">
              <select
                :id="`type-${index}`"
                v-model="transaction.type"
                @change="validateTransaction(index)"
                class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="BUY">買入</option>
                <option value="SELL">賣出</option>
              </select>
            </div>
          </div>

          <div class="sm:col-span-1">
            <label :for="`quantity-${index}`" class="block text-xs font-medium text-gray-700 dark:text-gray-300">
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
                class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                :class="{ 'border-red-500 focus:border-red-500 focus:ring-red-500': getValidationError(transaction) }"
              />
            </div>
          </div>

          <div class="sm:col-span-1">
            <label :for="`price-${index}`" class="block text-xs font-medium text-gray-700 dark:text-gray-300">價格</label>
            <div class="mt-1">
              <input
                type="number"
                :id="`price-${index}`"
                v-model.number="transaction.price"
                step="0.01"
                min="0"
                class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div class="sm:col-span-2">
            <label :for="`date-${index}`" class="block text-xs font-medium text-gray-700 dark:text-gray-300">日期時間</label>
            <div class="mt-1">
              <input
                type="datetime-local"
                :id="`date-${index}`"
                v-model="transaction.trade_date"
                class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>

        <!-- Validation Error Message -->
        <div v-if="getValidationError(transaction)" class="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center">
          <Icon name="heroicons:exclamation-triangle" class="h-4 w-4 mr-1" />
          {{ getValidationError(transaction) }}
        </div>
      </div>
    </div>

    <!-- Holdings Summary -->
    <div v-if="holdings.length > 0" class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
      <h4 class="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">目前持股（本表）</h4>
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
interface Transaction {
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  trade_date: string
}

interface Holding {
  symbol: string
  quantity: number
}

const props = defineProps<{
  modelValue: Transaction[]
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

// Calculate holdings from current transactions (excluding the one being validated)
const calculateHoldings = (excludeIndex: number = -1): Holding[] => {
  const holdingMap = new Map<string, number>()

  transactions.value.forEach((tx, idx) => {
    if (idx === excludeIndex) return // Skip the transaction being validated
    if (!tx.symbol) return

    // Symbol should already be uppercase due to the updateSymbol function
    const symbol = tx.symbol.trim()
    const current = holdingMap.get(symbol) || 0

    if (tx.type === 'BUY') {
      holdingMap.set(symbol, current + (tx.quantity || 0))
    } else if (tx.type === 'SELL') {
      holdingMap.set(symbol, current - (tx.quantity || 0))
    }
  })

  return Array.from(holdingMap.entries())
    .filter(([_, quantity]) => quantity > 0.0001)
    .map(([symbol, quantity]) => ({ symbol, quantity }))
}

// Holdings for display
const holdings = computed(() => calculateHoldings(-1))

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
      // Calculate holdings BEFORE this transaction
      const availableHoldings = calculateHoldings(index)
      const holding = availableHoldings.find(h => h.symbol === symbol)

      if (!holding || holding.quantity <= 0) {
        errors.push(`沒有 ${symbol} 的持股可賣`)
      } else if ((tx.quantity || 0) > holding.quantity) {
        errors.push(`賣出數量 (${formatQuantity(tx.quantity)}) 超過持股數量 (${formatQuantity(holding.quantity)})`)
      }
    }
  }

  if (errors.length > 0) {
    validationErrors.value.set(index, errors[0])
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
    trade_date: now.toISOString().slice(0, 16)
  })
}

const removeTransaction = (index: number) => {
  transactions.value.splice(index, 1)
  // Clear validation error and revalidate remaining transactions
  validationErrors.value.delete(index)
  // Revalidate all SELL transactions after removing one
  transactions.value.forEach((_, idx) => {
    if (transactions.value[idx].type === 'SELL') {
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

// Update symbol and convert to uppercase
const updateSymbol = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value.toUpperCase()
  transactions.value[index].symbol = value
  validateTransaction(index)
}
</script>
