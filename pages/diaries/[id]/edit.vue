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

  <div v-else class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">編輯日記</h1>
    </div>

    <form @submit.prevent="saveDiary" class="space-y-8">
      <div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="diary-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300">日期</label>
            <input
              type="date"
              id="diary-date"
              v-model="form.date"
              class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            />
          </div>
        </div>
      </div>

      <DiaryEditor
        v-model:title="form.title"
        v-model:content="form.content"
      />

      <TransactionInput v-model="form.transactions" :disciplines="disciplines" />

      <div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">提醒設定</h3>
          <button
            type="button"
            @click="addAlert"
            class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Icon name="heroicons:plus" class="mr-2 h-4 w-4" />
            新增提醒
          </button>
        </div>

        <div v-if="form.alerts.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
          尚無提醒
        </div>

        <div v-else class="space-y-4">
          <div v-for="(alert, index) in form.alerts" :key="index" class="flex items-start space-x-4 bg-gray-50 dark:bg-gray-700 p-3 rounded-md relative">
            <button
              type="button"
              @click="removeAlert(index)"
              class="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            >
              <Icon name="heroicons:x-mark" class="h-5 w-5" />
            </button>
            
            <div class="flex-grow grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label :for="`alert-msg-${index}`" class="block text-xs font-medium text-gray-700 dark:text-gray-300">訊息</label>
                <input
                  type="text"
                  :id="`alert-msg-${index}`"
                  v-model="alert.message"
                  class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  placeholder="提醒內容"
                />
              </div>
              <div>
                <label :for="`alert-time-${index}`" class="block text-xs font-medium text-gray-700 dark:text-gray-300">提醒日期</label>
                <input
                  type="date"
                  :id="`alert-time-${index}`"
                  v-model="alert.trigger_at"
                  class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end space-x-3">
        <NuxtLink
          :to="`/diaries/${id}`"
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
        >
          取消
        </NuxtLink>
        <button
          type="submit"
          :disabled="saving"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <Icon v-if="saving" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
          儲存變更
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthRecovery } from '~/composables/useAuthRecovery'
import { isAuthSessionError } from '~/lib/auth/session-error'
import { formatYmdInTimezone, toDateTimeLocalValue } from '~/lib/diary-date'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const id = route.params.id
const saving = ref(false)
const toast = useToast()
const { runWithAuthRecovery } = useAuthRecovery()
const { getTodayDateString, getTimezone } = useTimezone()

// Fetch disciplines for trade discipline checking
const { data: disciplines } = useFetch<Array<{ id: string; content: string }>>('/api/discipline')

// Use lazy fetch to avoid calling API during SSR before auth check
const { data: diary, pending, error } = await useLazyFetch<any>(`/api/diaries/${id}`)

const form = reactive({
  date: getTodayDateString(),
  title: '',
  content: '',
  transactions: [] as any[],
  alerts: [] as any[]
})

watch(diary, (newDiary) => {
  if (newDiary) {
    form.date = newDiary.date
      ? formatYmdInTimezone(newDiary.date, getTimezone())
      : getTodayDateString()
    form.title = newDiary.title
    form.content = newDiary.content || ''
    form.transactions = newDiary.transactions.map((t: any) => ({
      ...t,
      trade_date: toDateTimeLocalValue(t.tradeDate)
    }))
    form.alerts = newDiary.alerts.map((a: any) => ({
      ...a,
      trigger_at: formatYmdInTimezone(a.triggerAt, getTimezone())
    }))
  }
}, { immediate: true })

const addAlert = () => {
  const today = getTodayDateString()

  form.alerts.push({
    message: '',
    trigger_at: today
  })
}

const removeAlert = (index: number) => {
  form.alerts.splice(index, 1)
}

// Validate transactions before saving
const validateTransactions = (): string | null => {
  const holdings = new Map<string, number>()

  for (const tx of form.transactions) {
    if (!tx.symbol?.trim()) continue

    const symbol = tx.symbol.trim() // Already uppercase from input
    const current = holdings.get(symbol) || 0

    if (tx.type === 'BUY') {
      holdings.set(symbol, current + (tx.quantity || 0))
    } else if (tx.type === 'SELL') {
      const available = holdings.get(symbol) || 0
      if (available <= 0) {
        return `股票 ${symbol} 沒有持股可賣，請先添加買入記錄`
      }
      if ((tx.quantity || 0) > available) {
        return `股票 ${symbol} 賣出數量 (${tx.quantity}) 超過持股數量 (${available})`
      }
      holdings.set(symbol, available - (tx.quantity || 0))
    }
  }

  return null
}

const saveDiary = async () => {
  if (!form.title) {
    toast.error('請輸入標題')
    return
  }

  // Validate transactions
  const validationError = validateTransactions()
  if (validationError) {
    toast.error('交易記錄驗證失敗：' + validationError)
    return
  }

  saving.value = true
  try {
    const payload = {
      title: form.title,
      content: form.content,
      date: `${form.date}T12:00:00.000Z`,
      transactions: form.transactions.map(t => ({
        ...t,
        trade_date: new Date(t.trade_date).toISOString()
      })),
      alerts: form.alerts.map(a => ({
        ...a,
        trigger_at: `${a.trigger_at}T12:00:00.000Z`
      }))
    }

    await runWithAuthRecovery(async (): Promise<void> => {
      await $fetch(`/api/diaries/${id}` as string, {
        method: 'PUT' as const,
        body: payload
      } as any)
    })

    toast.success('日記更新成功！')

    // Show random discipline quote
    await showDisciplineToast()

    router.push(`/diaries/${id}`)
  } catch (e: any) {
    if (isAuthSessionError(e)) return
    console.error(e)
    toast.error('儲存失敗: ' + (e.data?.statusMessage || e.message))
  } finally {
    saving.value = false
  }
}
</script>
