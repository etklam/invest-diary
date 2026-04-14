<template>
  <!-- Loading State -->
  <div v-if="pending" class="max-w-[800px] mx-auto py-16 space-y-6">
    <BaseSkeleton variant="text" width="200px" />
    <BaseSkeleton variant="card" />
    <BaseSkeleton variant="card" />
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="max-w-[800px] mx-auto py-8">
    <BaseAlert variant="error">
      <h3 class="font-semibold">載入失敗</h3>
      <p class="mt-1">{{ error.message }}</p>
    </BaseAlert>
  </div>

  <!-- Edit Form -->
  <div v-else class="max-w-[800px] mx-auto pb-24">
    <header class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-copy">編輯日記</h1>
    </header>

    <form @submit.prevent="saveDiary" class="space-y-8">
      <!-- Date -->
      <BaseCard>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseInput
            v-model="form.date"
            type="date"
            label="日期"
            id="diary-date"
          />
        </div>
      </BaseCard>

      <!-- Editor -->
      <DiaryEditor
        v-model:title="form.title"
        v-model:content="form.content"
      />

      <!-- Transactions -->
      <TransactionInput v-model="form.transactions" />

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
            
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 pr-8">
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
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <NuxtLink :to="`/diaries/${id}`">
          <BaseButton variant="secondary">取消</BaseButton>
        </NuxtLink>
        <BaseButton
          variant="primary"
          type="submit"
          :disabled="saving"
          :loading="saving"
        >
          儲存變更
        </BaseButton>
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
