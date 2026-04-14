<template>
  <!-- Loading Skeleton -->
  <div v-if="pending" class="space-y-6">
    <div class="flex justify-between items-start">
      <div class="space-y-2">
        <BaseSkeleton variant="text" class="w-64 h-8" />
        <BaseSkeleton variant="text" class="w-40" />
      </div>
      <div class="flex gap-2">
        <BaseSkeleton variant="text" class="w-16 h-9" />
        <BaseSkeleton variant="text" class="w-16 h-9" />
      </div>
    </div>
    <BaseCard class="p-6">
      <BaseSkeleton variant="text" class="w-full" />
      <BaseSkeleton variant="text" class="w-full mt-2" />
      <BaseSkeleton variant="text" class="w-3/4 mt-2" />
      <BaseSkeleton variant="text" class="w-full mt-4" />
      <BaseSkeleton variant="text" class="w-2/3 mt-2" />
    </BaseCard>
  </div>

  <!-- Error -->
  <BaseAlert v-else-if="error" variant="error">
    <p class="font-medium">載入失敗</p>
    <p class="mt-1 text-sm">{{ error.message }}</p>
  </BaseAlert>

  <div v-else-if="diary" class="space-y-6">
    <!-- Alert Banner -->
    <BaseAlert v-if="diary.alerts && diary.alerts.length > 0" variant="warning">
      <div class="flex items-start">
        <Icon name="lucide:bell-ring" class="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div class="ml-3 flex-1">
          <h3 class="text-sm font-medium">提醒事項</h3>
          <div class="mt-2 space-y-2">
            <div v-for="alert in diary.alerts" :key="alert.id" class="flex items-start justify-between">
              <p class="text-sm">{{ alert.message }}</p>
              <span class="ml-2 text-xs whitespace-nowrap">
                {{ formatDate(alert.triggerAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </BaseAlert>

    <!-- Header -->
    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-3xl font-semibold text-copy">{{ diary.title }}</h1>
        <p class="mt-1 text-sm text-copy-muted">
          {{ formatLocaleDateTime(diary.createdAt) }}
        </p>
      </div>
      <div class="flex gap-2">
        <NuxtLink :to="`/diaries/${diary.id}/edit`">
          <BaseButton variant="secondary" size="sm">
            <Icon name="lucide:pencil" class="mr-1.5 h-4 w-4" />
            編輯
          </BaseButton>
        </NuxtLink>
        <BaseButton variant="danger" size="sm" @click="deleteDiary">
          <Icon name="lucide:trash-2" class="mr-1.5 h-4 w-4" />
          刪除
        </BaseButton>
      </div>
    </div>

    <!-- Content -->
    <BaseCard class="overflow-hidden">
      <div class="px-4 py-5 sm:p-6 prose dark:prose-invert max-w-none">
        <MDC :value="diary.content || ''" />
      </div>
    </BaseCard>

    <!-- Transactions -->
    <div v-if="diary.transactions && diary.transactions.length > 0" class="space-y-6">
      <BaseCard class="overflow-hidden">
        <div class="px-4 py-4 sm:px-6 border-b border-line">
          <h3 class="text-lg font-medium text-copy">
            交易記錄
          </h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-line">
            <thead class="bg-surface-alt">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-copy-muted uppercase tracking-wider">代碼</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-copy-muted uppercase tracking-wider">類型</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-copy-muted uppercase tracking-wider">數量</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-copy-muted uppercase tracking-wider">價格</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-copy-muted uppercase tracking-wider">總額</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-copy-muted uppercase tracking-wider">時間</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="tx in diary.transactions" :key="tx.id" class="hover:bg-surface-alt transition-colors duration-fast">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-copy font-mono">{{ tx.symbol }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <BaseBadge :variant="tx.type === 'BUY' ? 'success' : 'error'">
                    {{ tx.type === 'BUY' ? '買入' : '賣出' }}
                  </BaseBadge>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-copy-secondary text-right font-mono tabular-nums">{{ tx.quantity }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-copy-secondary text-right font-mono tabular-nums">{{ tx.price }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-copy-secondary text-right font-mono tabular-nums">{{ (Number(tx.quantity) * Number(tx.price)).toFixed(2) }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-copy-secondary">{{ formatLocaleDateTime(tx.tradeDate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>

      <HoldingsDisplay :transactions="diary.transactions.map((tx: any) => ({ ...tx, quantity: Number(tx.quantity), price: Number(tx.price) }))" />
    </div>

  </div>
</template>

<script setup lang="ts">
import { useAuthRecovery } from '~/composables/useAuthRecovery'
import { isAuthSessionError } from '~/lib/auth/session-error'
import { formatShortDate } from '~/lib/utils'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const id = route.params.id

// Use lazy fetch to avoid calling API during SSR before auth check
const { data: diary, pending, error } = await useLazyFetch<any>(`/api/diaries/${id}`)

const toast = useToast()
const { runWithAuthRecovery } = useAuthRecovery()
const { formatLocaleDateTime } = useTimezone()

// Rename for template compatibility
const formatDate = formatShortDate

const deleteDiary = async () => {
  if (!confirm('確定要刪除這篇日記嗎？此操作無法復原。')) return

  try {
    await runWithAuthRecovery(async (): Promise<void> => {
      await $fetch(`/api/diaries/${id}` as string, {
        method: 'DELETE' as const
      } as any)
    })
    toast.success('日記已刪除')
    router.push('/diaries')
  } catch (e: any) {
    if (isAuthSessionError(e)) return
    toast.error('刪除失敗')
    console.error(e)
  }
}
</script>
