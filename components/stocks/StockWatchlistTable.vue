<template>
  <div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead class="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
          <tr class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <th class="px-4 py-3">{{ t('stock.symbol') }}</th>
            <th class="px-4 py-3 min-w-[240px]">{{ t('stock.watchlist.latestRecord') }}</th>
            <th class="px-4 py-3">{{ t('stock.watchlist.recordCount') }}</th>
            <th class="px-4 py-3">{{ t('stock.watchlist.updatedAt') }}</th>
            <th class="px-4 py-3 text-right">{{ t('stock.watchlist.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
            <td class="px-4 py-3">
              <NuxtLink :to="`/stocks/${item.stock.symbol}`" class="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                {{ item.stock.symbol }}
              </NuxtLink>
            </td>
            <td class="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
              {{ item.latestRecord?.summary || t('stock.watchlist.noRecord') }}
            </td>
            <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{{ item.recordCount }}</td>
            <td class="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{{ formatAt(item.updatedAt) }}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end">
                <button
                  class="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400"
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
  stock: { symbol: string }
  recordCount: number
  latestRecord?: { summary?: string | null } | null
}

defineProps<{
  items: WatchlistItem[]
  removingId?: string | null
}>()

defineEmits<{
  archive: [id: string]
}>()

const { t, locale } = useI18n()

const formatAt = (value: string) =>
  new Date(value).toLocaleString(locale.value === 'zh-TW' ? 'zh-TW' : locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
</script>
