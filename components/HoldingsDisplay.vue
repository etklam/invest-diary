<template>
  <div>
    <p class="mb-3 text-sm leading-relaxed text-dt-text-muted">
      {{ t('diary.decisionRecord.holdingsDescription') }}
    </p>

    <p v-if="holdingsUnavailable" role="status" class="rounded-dt-sm border border-dt-border bg-dt-surface px-3 py-4 text-sm text-dt-text-muted">
      {{ t('diary.decisionRecord.holdingsUnavailable') }}
    </p>

    <div v-else class="hidden overflow-x-auto sm:block">
      <table class="min-w-full divide-y divide-dt-border">
        <thead>
          <tr>
            <th scope="col" class="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.form.symbol') }}</th>
            <th scope="col" class="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.form.quantity') }}</th>
            <th scope="col" class="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.decisionRecord.averageCost') }}</th>
            <th scope="col" class="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-dt-text-muted">{{ t('diary.decisionRecord.totalCost') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-dt-border">
          <tr v-for="holding in holdings" :key="holding.symbol">
            <td class="whitespace-nowrap px-3 py-3 font-data text-sm font-semibold text-dt-text">{{ holding.symbol }}</td>
            <td class="whitespace-nowrap px-3 py-3 text-right font-data text-sm text-dt-text-soft">{{ holding.quantity.toFixed(4) }}</td>
            <td class="whitespace-nowrap px-3 py-3 text-right font-data text-sm text-dt-text-soft">{{ holding.avgCost.toFixed(2) }}</td>
            <td class="whitespace-nowrap px-3 py-3 text-right font-data text-sm text-dt-text-soft">{{ holding.totalCost.toFixed(2) }}</td>
          </tr>
          <tr v-if="holdings.length === 0">
            <td colspan="4" class="px-3 py-5 text-center text-sm text-dt-text-muted">
              {{ t('diary.decisionRecord.noHoldings') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ul v-if="!holdingsUnavailable" class="space-y-3 sm:hidden">
      <li v-if="holdings.length === 0" class="py-4 text-center text-sm text-dt-text-muted">
        {{ t('diary.decisionRecord.noHoldings') }}
      </li>
      <li
        v-for="holding in holdings"
        :key="holding.symbol"
        class="rounded-dt-sm border border-dt-border bg-dt-surface p-3"
      >
        <h4 class="font-data text-sm font-semibold text-dt-text">{{ holding.symbol }}</h4>
        <dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div>
            <dt class="text-dt-text-muted">{{ t('diary.form.quantity') }}</dt>
            <dd class="mt-0.5 font-data text-dt-text">{{ holding.quantity.toFixed(4) }}</dd>
          </div>
          <div class="text-right">
            <dt class="text-dt-text-muted">{{ t('diary.decisionRecord.averageCost') }}</dt>
            <dd class="mt-0.5 font-data text-dt-text">{{ holding.avgCost.toFixed(2) }}</dd>
          </div>
          <div class="col-span-2 text-right">
            <dt class="text-dt-text-muted">{{ t('diary.decisionRecord.totalCost') }}</dt>
            <dd class="mt-0.5 font-data text-dt-text">{{ holding.totalCost.toFixed(2) }}</dd>
          </div>
        </dl>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { calculateHoldings, type TransactionForHolding } from '~/lib/position-state'

const { t } = useI18n()

const props = defineProps<{
  transactions: TransactionForHolding[]
}>()

const holdingsResult = computed(() => {
  try {
    return { items: calculateHoldings(props.transactions || []), unavailable: false }
  } catch {
    // A Diary can validly SELL holdings acquired in an earlier Diary. The
    // local Transaction subset cannot calculate that cost basis on its own.
    return { items: [], unavailable: true }
  }
})

const holdings = computed(() => holdingsResult.value.items)
const holdingsUnavailable = computed(() => holdingsResult.value.unavailable)
</script>
