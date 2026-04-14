<template>
  <div class="max-w-[800px] mx-auto pb-24">
    <!-- Header -->
    <header class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight text-copy">
          {{ isEditing ? '編輯日記' : '新增日記' }}
        </h1>
        <p v-if="isEditing" class="text-sm text-copy-muted">已載入該日期的既有日記</p>
      </div>
    </header>

    <form @submit.prevent="saveDiary" class="space-y-8">
      <!-- Date Picker -->
      <BaseCard>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseInput
            v-model="form.date"
            type="date"
            label="日期"
            id="diary-date"
            :disabled="checkingDate"
          />
          <div v-if="checkingDate" class="flex items-end pb-2">
            <BaseSkeleton variant="text" width="120px" />
          </div>
        </div>
      </BaseCard>

      <!-- Diary Editor -->
      <DiaryEditor
        v-model:title="form.title"
        v-model:content="form.content"
      />

      <!-- Transactions -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-copy">交易記錄</h3>
          <BaseButton
            variant="secondary"
            size="sm"
            @click="copyFromLatest"
            :disabled="loadingLatest"
            :loading="loadingLatest"
          >
            <Icon v-if="!loadingLatest" name="lucide:copy" class="mr-2 h-4 w-4" />
            複製上筆交易
          </BaseButton>
        </div>
        <TransactionInput v-model="form.transactions" />
      </div>

      <!-- Alerts -->
      <BaseCard>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-copy">提醒設定</h3>
          <BaseButton variant="primary" size="sm" @click="addAlert">
            <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
            新增提醒
          </BaseButton>
        </div>

        <div v-if="form.alerts.length === 0" class="text-center py-6">
          <p class="text-sm text-copy-muted">尚無提醒</p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="(alert, index) in form.alerts" :key="index" class="relative bg-surface-alt border border-line p-4">
            <button
              type="button"
              @click="removeAlert(index)"
              class="absolute top-3 right-3 text-copy-muted hover:text-semantic-error transition-colors"
            >
              <Icon name="lucide:x" class="h-4 w-4" />
            </button>
            
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 pr-8">
              <BaseInput
                v-model="alert.message"
                :id="`alert-msg-${index}`"
                label="訊息"
                placeholder="提醒內容"
              />
              <BaseInput
                v-model="alert.trigger_at"
                type="date"
                :id="`alert-time-${index}`"
                label="提醒日期"
              />
              <div class="flex flex-col gap-1.5">
                <BaseSelect
                  v-model="alert.recurring_mode"
                  :id="`alert-recurring-${index}`"
                  label="持續提醒"
                  :options="[
                    { label: '不重複', value: '' },
                    { label: '本周（到週五）', value: 'WEEK' },
                    { label: '本月（到月底）', value: 'MONTH' }
                  ]"
                />
                <p class="text-xs text-copy-muted">
                  {{ getRecurringDescription(alert.recurring_mode) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <NuxtLink to="/diaries">
          <BaseButton variant="secondary">取消</BaseButton>
        </NuxtLink>
        <BaseButton
          variant="primary"
          type="submit"
          :disabled="saving"
          :loading="saving"
        >
          {{ isEditing ? '更新日記' : '儲存日記' }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthRecovery } from '~/composables/useAuthRecovery'
import { toDateTimeLocalValue } from '~/lib/diary-date'
import { isAuthSessionError } from '~/lib/auth/session-error'

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
const { runWithAuthRecovery } = useAuthRecovery()
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
    const existingDiary = await runWithAuthRecovery(() => $fetch<any>(`/api/diaries/by-date?date=${newDate}`))
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
        trade_date: toDateTimeLocalValue(tx.tradeDate),
        notes: tx.notes ?? undefined,
        strategy: tx.strategy ?? undefined,
        emotion: tx.emotion ?? undefined,
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
    if (isAuthSessionError(error)) return
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
  loadingLatest.value = true
  try {
    const latest = await runWithAuthRecovery(() => $fetch<any>('/api/transactions/latest'))

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
    if (isAuthSessionError(error)) return
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
      await runWithAuthRecovery(async (): Promise<void> => {
        await $fetch(`/api/diaries/${existingDiaryId.value}` as string, {
          method: 'PUT' as const,
          body: payload
        } as any)
      })
      toast.success('日記更新成功！')
    } else {
      // Create new diary
      await runWithAuthRecovery(async (): Promise<void> => {
        await $fetch('/api/diaries', {
          method: 'POST',
          body: payload
        })
      })
      toast.success('日記儲存成功！')
    }

    // Show random discipline quote
    await showDisciplineToast()

    router.push('/diaries')
  } catch (e: any) {
    if (isAuthSessionError(e)) return
    console.error(e)
    toast.error('儲存失敗: ' + (e.data?.statusMessage || e.message))
  } finally {
    saving.value = false
  }
}
</script>
