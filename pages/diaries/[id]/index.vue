<template>
  <div v-if="pending" class="text-center py-12">
    <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-indigo-600" />
    <p class="mt-2 text-gray-500">載入中...</p>
  </div>

  <div v-else-if="error" class="bg-red-50 p-4 rounded-md">
    <div class="flex">
      <div class="flex-shrink-0">
        <Icon name="heroicons:x-circle" class="h-5 w-5 text-red-400" />
      </div>
      <div class="ml-3">
        <h3 class="text-sm font-medium text-red-800">載入失敗</h3>
        <div class="mt-2 text-sm text-red-700">
          {{ error.message }}
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="diary" class="space-y-6">
    <!-- 提醒置頂顯示 -->
    <div v-if="diary.alerts && diary.alerts.length > 0" class="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 rounded-r-md">
      <div class="flex items-start">
        <Icon name="heroicons:bell-alert" class="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div class="ml-3 flex-1">
          <h3 class="text-sm font-medium text-amber-800 dark:text-amber-200">提醒事項</h3>
          <div class="mt-2 space-y-2">
            <div v-for="alert in diary.alerts" :key="alert.id" class="flex items-start justify-between">
              <p class="text-sm text-amber-700 dark:text-amber-300">{{ alert.message }}</p>
              <span class="ml-2 text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                {{ formatDate(alert.triggerAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ diary.title }}</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ new Date(diary.createdAt).toLocaleString() }}
        </p>
      </div>
      <div class="flex space-x-3">
        <NuxtLink
          :to="`/diaries/${diary.id}/edit`"
          class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
        >
          <Icon name="heroicons:pencil" class="mr-2 h-4 w-4" />
          編輯
        </NuxtLink>
        <button
          @click="deleteDiary"
          class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Icon name="heroicons:trash" class="mr-2 h-4 w-4" />
          刪除
        </button>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
      <div class="px-4 py-5 sm:p-6 prose dark:prose-invert max-w-none">
        <MDC :value="diary.content" />
      </div>
    </div>

    <div v-if="diary.transactions && diary.transactions.length > 0" class="space-y-6">
      <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            交易記錄
          </h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">代碼</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">類型</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">數量</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">價格</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">總額</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">時間</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="tx in diary.transactions" :key="tx.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{{ tx.symbol }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span :class="tx.type === 'BUY' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                    {{ tx.type === 'BUY' ? '買入' : '賣出' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{{ tx.quantity }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{{ tx.price }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{{ (tx.quantity * tx.price).toFixed(2) }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{{ new Date(tx.tradeDate).toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <HoldingsDisplay :transactions="diary.transactions" />
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const id = route.params.id

// Use lazy fetch to avoid calling API during SSR before auth check
const { data: diary, pending, error } = await useLazyFetch(`/api/diaries/${id}`)

const toast = useToast()
const { user } = useAuth()

// Format date for alerts
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}/${month}/${day}`
}

const deleteDiary = async () => {
  if (!confirm('確定要刪除這篇日記嗎？此操作無法復原。')) return

  try {
    await $fetch(`/api/diaries/${id}`, {
      method: 'DELETE'
    })
    toast.success('日記已刪除')
    router.push('/diaries')
  } catch (e: any) {
    // Handle 401 Unauthorized errors
    if (e?.statusCode === 401) {
      user.value = null
      await navigateTo('/')
    }
    toast.error('刪除失敗')
    console.error(e)
  }
}
</script>
