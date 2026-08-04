<template>
  <div v-if="pending" class="flex flex-col items-center justify-center py-16">
    <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-dt-primary" />
    <p class="mt-3 text-sm text-dt-text-muted">{{ t('common.loading') }}</p>
  </div>

  <ErrorState v-else-if="error" :title="t('diary.loadFailed')" :message="error.message" />

  <div v-else-if="diary" class="space-y-6">
    <!-- 提醒置頂顯示 -->
    <div
      v-if="diary.alerts && diary.alerts.length > 0"
      class="rounded-dt-sm border border-dt-warning/40 bg-dt-surface p-4 shadow-dt-sm"
      style="background: color-mix(in srgb, var(--color-warning) 8%, var(--color-surface));"
    >
      <div class="flex items-start gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-dt-sm border border-dt-warning/30 bg-dt-surface">
          <Icon name="heroicons:bell-alert" class="h-5 w-5 text-dt-warning" />
        </span>
        <div class="min-w-0 flex-1">
          <h3 class="text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
            {{ t('diary.view.alerts') }}
          </h3>
          <div class="mt-2 space-y-2">
            <div v-for="alert in diary.alerts" :key="alert.id" class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <p class="text-sm text-dt-text">{{ alert.message }}</p>
              <span class="shrink-0 font-data text-xs text-dt-text-muted">
                {{ formatDate(alert.triggerAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h1 class="font-display text-2xl font-semibold tracking-tight text-dt-text sm:text-3xl">{{ diary.title }}</h1>
        <p class="mt-1 font-data text-sm text-dt-text-muted">
          {{ formatLocaleDateTime(diary.createdAt) }}
        </p>
      </div>
      <div class="flex w-full gap-3 sm:w-auto">
        <BaseButton variant="secondary" class="flex-1 sm:flex-none" @click="router.push(`/diaries/${diary.id}/edit`)">
          <Icon name="heroicons:pencil" class="h-4 w-4" />
          {{ t('common.edit') }}
        </BaseButton>
        <BaseButton variant="danger" class="flex-1 sm:flex-none" @click="deleteDiary">
          <Icon name="heroicons:trash" class="h-4 w-4" />
          {{ t('common.delete') }}
        </BaseButton>
      </div>
    </div>

    <div v-if="diary.thesis || diary.risk" class="grid gap-4 md:grid-cols-2">
      <LedgerCard v-if="diary.thesis">
        <h3 class="text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
          {{ t('diary.fields.thesis') }}
        </h3>
        <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-dt-text">{{ diary.thesis }}</p>
      </LedgerCard>
      <LedgerCard v-if="diary.risk">
        <h3 class="text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
          {{ t('diary.fields.risk') }}
        </h3>
        <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-dt-text">{{ diary.risk }}</p>
      </LedgerCard>
    </div>

    <LedgerCard>
      <div class="prose dark:prose-invert max-w-none">
        <MDC :value="diary.content || ''" />
      </div>
    </LedgerCard>

    <div v-if="diary.transactions && diary.transactions.length > 0" class="space-y-6">
      <LedgerCard :title="t('diary.form.transactions')">
        <!-- Mobile: stacked ledger rows -->
        <ul class="space-y-3 sm:hidden">
          <li
            v-for="tx in diary.transactions"
            :key="`m-${tx.id}`"
            class="rounded-dt-sm border border-dt-border bg-dt-surface-strong p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-data text-sm font-semibold text-dt-text">{{ tx.symbol }}</span>
              <StatusBadge :tone="tx.type === 'BUY' ? 'success' : 'danger'">
                {{ tx.type === 'BUY' ? t('diary.form.buy') : t('diary.form.sell') }}
              </StatusBadge>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2 font-data text-xs text-dt-text-muted">
              <span>{{ t('diary.form.quantity') }} · {{ tx.quantity }}</span>
              <span class="text-right">{{ t('diary.form.price') }} · {{ tx.price }}</span>
              <span>{{ t('diary.view.total') }} · {{ (Number(tx.quantity) * Number(tx.price)).toFixed(2) }}</span>
              <span class="text-right">{{ formatLocaleDateTime(tx.tradeDate) }}</span>
            </div>
          </li>
        </ul>

        <!-- Desktop: table -->
        <div class="hidden overflow-x-auto sm:block">
          <table class="min-w-full divide-y divide-dt-border">
            <thead>
              <tr>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.form.symbol') }}</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.form.type') }}</th>
                <th scope="col" class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.form.quantity') }}</th>
                <th scope="col" class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.form.price') }}</th>
                <th scope="col" class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.view.total') }}</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.view.time') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dt-border">
              <tr v-for="tx in diary.transactions" :key="tx.id">
                <td class="whitespace-nowrap px-4 py-3 font-mono text-sm font-medium text-dt-text">{{ tx.symbol }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-sm">
                  <StatusBadge :tone="tx.type === 'BUY' ? 'success' : 'danger'">
                    {{ tx.type === 'BUY' ? t('diary.form.buy') : t('diary.form.sell') }}
                  </StatusBadge>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-dt-text-soft">{{ tx.quantity }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-dt-text-soft">{{ tx.price }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-dt-text-soft">{{ (Number(tx.quantity) * Number(tx.price)).toFixed(2) }}</td>
                <td class="whitespace-nowrap px-4 py-3 font-mono text-sm text-dt-text-soft">{{ formatLocaleDateTime(tx.tradeDate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </LedgerCard>

      <HoldingsDisplay :transactions="diary.transactions.map((tx: any) => ({ ...tx, quantity: Number(tx.quantity), price: Number(tx.price) }))" />
    </div>

  </div>
</template>

<script setup lang="ts">
import { useAuthRecovery } from '~/composables/useAuthRecovery'
import { isAuthSessionError } from '~/lib/auth/session-error'
import { formatShortDate } from '~/lib/dates'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const id = route.params.id
const { t } = useI18n()

// Use lazy fetch to avoid calling API during SSR before auth check
const { data: diary, pending, error } = await useLazyFetch<any>(`/api/diaries/${id}`)

const toast = useToast()
const { runWithAuthRecovery } = useAuthRecovery()
const { formatLocaleDateTime } = useTimezone()

// Rename for template compatibility
const formatDate = formatShortDate

const deleteDiary = async () => {
  if (!confirm(t('diary.deleteConfirm'))) return

  try {
    await runWithAuthRecovery(async (): Promise<void> => {
      await $fetch(`/api/diaries/${id}` as string, {
        method: 'DELETE' as const
      } as any)
    })
    toast.success(t('diary.deleteSuccess'))
    router.push('/diaries')
  } catch (e: any) {
    if (isAuthSessionError(e)) return
    toast.error(t('diary.deleteFailed'))
    console.error(e)
  }
}
</script>
