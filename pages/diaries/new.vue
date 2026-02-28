<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ isEditing ? '編輯日記' : '新增日記' }}
      </h1>
      <div v-if="isEditing" class="text-sm text-gray-500 dark:text-gray-400">
        已載入該日期的既有日記
      </div>
    </div>

    <form @submit.prevent="saveDiary" class="space-y-8">
      <div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="diary-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              日期
              <Icon v-if="checkingDate" name="svg-spinners:180-ring-with-bg" class="inline-block ml-2 h-4 w-4" />
            </label>
            <input
              type="date"
              id="diary-date"
              v-model="form.date"
              :disabled="checkingDate"
              class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <DiaryEditor
        v-model:title="form.title"
        v-model:content="form.content"
      />

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">交易記錄</h3>
          <button
            type="button"
            @click="copyFromLatest"
            :disabled="loadingLatest"
            class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Icon v-if="loadingLatest" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
            <Icon v-else name="heroicons:document-duplicate" class="mr-2 h-4 w-4" />
            複製上筆交易
          </button>
        </div>
        <TransactionInput v-model="form.transactions" />
      </div>

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
            
            <div class="flex-grow grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              <div>
                <label :for="`alert-recurring-${index}`" class="block text-xs font-medium text-gray-700 dark:text-gray-300">持續提醒</label>
                <select
                  :id="`alert-recurring-${index}`"
                  v-model="alert.recurring_mode"
                  class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                >
                  <option value="">不重複</option>
                  <option value="WEEK">本周（到週五）</option>
                  <option value="MONTH">本月（到月底）</option>
                </select>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {{ getRecurringDescription(alert.recurring_mode) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end space-x-3">
        <NuxtLink
          to="/diaries"
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
          {{ isEditing ? '更新日記' : '儲存日記' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { toDateTimeLocalValue } from '~/lib/diary-date'

definePageMeta({
  middleware: 'auth'
})

const router = useRouter()
const route = useRoute()
const saving = ref(false)
const checkingDate = ref(false)
const loadingLatest = ref(false)
const isEditing = ref(false)
const existingDiaryId = ref<string | null>(null)
const { getTodayDateString, formatLocaleDate, getTimezone } = useTimezone()

// Get date from URL query parameter or use today
const initialDate = (route.query.date as string) || getTodayDateString()

const form = reactive({
  date: initialDate,
  title: '',
  content: '',
  transactions: [] as any[],
  alerts: [] as any[]
})

// Watch for date changes and check if diary exists
watch(() => form.date, async (newDate) => {
  if (!newDate) return

  checkingDate.value = true
  try {
    const existingDiary = await $fetch<any>(`/api/diaries/by-date?date=${newDate}`)
    if (existingDiary) {
      // Diary exists for this date, load it for editing
      isEditing.value = true
      existingDiaryId.value = existingDiary.id.toString()

      // Load diary data into form
      form.title = existingDiary.title
      form.content = existingDiary.content || ''

      // Load transactions
      form.transactions = existingDiary.transactions?.map((tx: any) => ({
        id: tx.id.toString(),
        symbol: tx.symbol,
        type: tx.type,
        quantity: parseFloat(tx.quantity),
        price: parseFloat(tx.price),
        trade_date: toDateTimeLocalValue(tx.tradeDate)
      })) || []

      // Load alerts
      form.alerts = existingDiary.alerts?.map((a: any) => ({
        id: a.id.toString(),
        message: a.message,
        trigger_at: new Intl.DateTimeFormat('en-CA', {
          timeZone: getTimezone(),
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(new Date(a.triggerAt))
      })) || []
    } else {
      // No diary exists for this date, reset form for new entry
      isEditing.value = false
      existingDiaryId.value = null
      form.title = ''
      form.content = ''
      form.transactions = []
      form.alerts = []
    }
  } catch (error) {
    console.error('Error checking existing diary:', error)
  } finally {
    checkingDate.value = false
  }
})

// Try to fetch latest transactions to copy holdings if needed
// For now, we start fresh

const addAlert = () => {
  const today = getTodayDateString()

  form.alerts.push({
    message: '',
    trigger_at: today,
    recurring_mode: ''
  })
}

const getRecurringDescription = (mode: string) => {
  if (mode === 'WEEK') return '每個工作日提醒，直到本週五'
  if (mode === 'MONTH') return '每個工作日提醒，直到本月底'
  return '僅提醒一次'
}

const removeAlert = (index: number) => {
  form.alerts.splice(index, 1)
}

// Copy transactions from latest diary
const copyFromLatest = async () => {
  const toast = useToast()
  const { user } = useAuth()
  loadingLatest.value = true
  try {
    const latest = await $fetch<any>('/api/transactions/latest')

    if (latest && latest.transactions && latest.transactions.length > 0) {
      // Add transactions to form
      const newTransactions = latest.transactions.map((tx: any) => ({
        symbol: tx.symbol.toUpperCase(),
        type: tx.type,
        quantity: parseFloat(tx.quantity),
        price: parseFloat(tx.price),
        trade_date: getTodayDateString() // Use today's date in user's timezone
      }))

      // Append to existing transactions or replace if empty
      if (form.transactions.length === 0) {
        form.transactions = newTransactions
      } else {
        form.transactions = [...form.transactions, ...newTransactions]
      }

      // Show success feedback
      const diaryDate = formatLocaleDate(latest.diary_date)
      toast.success(`已複製 ${newTransactions.length} 筆交易記錄（來源：${diaryDate}）`)
    } else {
      toast.warning('沒有找到之前的交易記錄')
    }
  } catch (error: any) {
    // Handle 401 Unauthorized errors
    if (error?.statusCode === 401) {
      user.value = null
      await navigateTo('/')
    }
    console.error('Error fetching latest transactions:', error)
    toast.error('複製失敗，請稍後再試')
  } finally {
    loadingLatest.value = false
  }
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
  const toast = useToast()
  const { user } = useAuth()

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
    // Store date-only fields at UTC noon for timezone-stable day semantics
    const toApiDayNoon = (dateStr: string) => {
      return `${dateStr}T12:00:00.000Z`
    }

    // Keep transaction datetime precision
    const toApiDateTime = (dateTimeStr: string) => {
      return new Date(dateTimeStr).toISOString()
    }

    const payload = {
      title: form.title,
      content: form.content,
      date: toApiDayNoon(form.date),
      transactions: form.transactions.map(t => ({
        ...t,
        trade_date: toApiDateTime(t.trade_date)
      })),
      alerts: form.alerts.map(a => ({
        ...a,
        trigger_at: toApiDayNoon(a.trigger_at),
        recurring_mode: a.recurring_mode || undefined
      }))
    }

    if (isEditing.value && existingDiaryId.value) {
      // Update existing diary
      await $fetch(`/api/diaries/${existingDiaryId.value}` as string, {
        method: 'PUT' as const,
        body: payload
      } as any)
      toast.success('日記更新成功！')
    } else {
      // Create new diary
      await $fetch('/api/diaries', {
        method: 'POST',
        body: payload
      })
      toast.success('日記儲存成功！')
    }

    // Show random discipline quote
    await showDisciplineToast()

    router.push('/diaries')
  } catch (e: any) {
    // Handle 401 Unauthorized errors
    if (e?.statusCode === 401) {
      user.value = null
      await navigateTo('/')
    }
    console.error(e)
    toast.error('儲存失敗: ' + (e.data?.statusMessage || e.message))
  } finally {
    saving.value = false
  }
}
</script>
