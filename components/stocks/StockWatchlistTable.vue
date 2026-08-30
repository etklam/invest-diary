<template>
  <div class="rounded-xl border border-dt-border overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead class="bg-dt-surface-strong/60 border-b border-dt-border">
          <tr class="text-[11px] font-semibold uppercase tracking-wider text-dt-text-soft">
            <th class="px-4 py-3">{{ t('stock.symbol') }}</th>
            <th class="px-4 py-3">{{ t('stock.watchlist.editModal.status') }}</th>
            <th class="px-4 py-3 min-w-[240px]">{{ t('stock.watchlist.latestRecord') }}</th>
            <th class="px-4 py-3">{{ t('stock.watchlist.recordCount') }}</th>
            <th class="px-4 py-3">{{ t('stock.watchlist.updatedAt') }}</th>
            <th class="px-4 py-3 text-right">{{ t('stock.watchlist.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-dt-border">
          <tr v-for="item in items" :key="item.id" class="hover:bg-dt-surface-strong/70 ">
            <td class="px-4 py-3">
              <NuxtLink :to="`/stocks/${item.stock.symbol}`" class="font-semibold text-dt-info hover:underline">
                {{ item.stock.symbol }}
              </NuxtLink>
            </td>
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                :class="item.status === 'ARCHIVED'
                  ? 'bg-dt-surface-strong text-dt-text-muted'
                  : 'bg-dt-success/10 text-dt-success-strong'"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :class="item.status === 'ARCHIVED' ? 'bg-dt-text-soft/60' : 'bg-dt-success/60'"
                />
                {{ t(`stock.watchlist.editModal.status${item.status === 'ARCHIVED' ? 'Archived' : 'Watching'}`) }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-dt-text">
              {{ item.latestRecord?.summary || t('stock.watchlist.noRecord') }}
            </td>
            <td class="px-4 py-3 text-sm text-dt-text-muted">{{ item.recordCount }}</td>
            <td class="px-4 py-3 text-sm text-dt-text-soft">{{ formatAt(item.updatedAt) }}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2">
                <button
                  class="inline-flex items-center gap-1 text-xs font-semibold text-dt-text-muted hover:text-dt-danger dark:hover:text-dt-danger"
                  :disabled="removingId === item.id"
                  @click="$emit('archive', item.id)"
                >
                  <Icon :name="removingId === item.id ? 'svg-spinners:180-ring-with-bg' : 'heroicons:archive-box'" class="w-3.5 h-3.5" />
                  {{ t('stock.watchlist.archive') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
interface WatchlistItem {
  id: string
  updatedAt: string
  stock: { symbol: string; name?: string | null }
  recordCount: number
  latestRecord?: { summary?: string | null } | null
  status?: string
  sortOrder?: number
}

defineProps<{
  items: WatchlistItem[]
  removingId?: string | null
}>()

defineEmits<{
  archive: [id: string]
}>()

const { t } = useI18n()
const { formatLocaleDate } = useTimezone()

const formatAt = (value: string) => formatLocaleDate(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
</script>
