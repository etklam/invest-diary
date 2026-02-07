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
                v-model="transaction.symbol"
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
                class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="BUY">買入</option>
                <option value="SELL">賣出</option>
              </select>
            </div>
          </div>

          <div class="sm:col-span-1">
            <label :for="`quantity-${index}`" class="block text-xs font-medium text-gray-700 dark:text-gray-300">數量</label>
            <div class="mt-1">
              <input
                type="number"
                :id="`quantity-${index}`"
                v-model.number="transaction.quantity"
                step="0.0001"
                class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
}
</script>
