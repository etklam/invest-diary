<script setup lang="ts">
import LedgerCard from '~/components/LedgerCard.vue'
import BaseButton from '~/components/BaseButton.vue'
import {
  monthlyData,
  getMonthName,
  getMonthShortName,
  getVolatilityLabel,
  getStrengthLabel,
  getMonthStrength,
  formatReturn,
  getReturnColorClass,
  getVolatilityColorClass,
  getBestMonths,
  getWorstMonths,
  calculatePeriodAvgReturn,
  getCurrentMonth,
  analyzeSeasonality
} from '~/lib/stockSeasonality'
import type { VolatilityLevel } from '~/lib/stockSeasonality'
import { useResearchCapture } from '~/composables/useResearchCapture'

const { t, locale } = useI18n()
const toast = useToast()
const { getTimezone } = useTimezone()
const researchCapture = useResearchCapture()

const currentMonth = getCurrentMonth(getTimezone())
const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1

const currentMonthData = computed(() => monthlyData.find(m => m.month === currentMonth)!)
const nextMonthData = computed(() => monthlyData.find(m => m.month === nextMonth)!)
const bestMonths = computed(() => getBestMonths(3))
const worstMonths = computed(() => getWorstMonths(3))

const strongPeriodMonths = [11, 12, 1, 2, 3, 4]
const weakPeriodMonths = [5, 6, 7, 8, 9, 10]

const strongPeriodReturn = computed(() => calculatePeriodAvgReturn(strongPeriodMonths))
const weakPeriodReturn = computed(() => calculatePeriodAvgReturn(weakPeriodMonths))
const analysis = computed(() => analyzeSeasonality(getTimezone()))

const getLocalizedName = (month: number) => getMonthName(month, locale.value)
const getLocalizedShortName = (month: number) => getMonthShortName(month, locale.value)
const getLocalizedVolatility = (volatility: VolatilityLevel) => getVolatilityLabel(volatility, locale.value)
const getLocalizedStrength = (avgReturn: number) => getStrengthLabel(getMonthStrength(avgReturn), locale.value)

const getCharacteristics = (month: number) => {
  const monthData = monthlyData.find(m => m.month === month)
  if (!monthData) return ''
  return t(monthData.characteristicsKey)
}

function openSeasonalityCapture(): void {
  const windowLabel = t('tools.seasonality.dataPeriod')
  const metricLabel = t('tools.seasonality.avgReturn')
  const strongestMonth = bestMonths.value[0]
  const weakestMonth = worstMonths.value[0]
  const sourceTitle = t('researchCapture.sources.seasonality')

  researchCapture.open({
    sourceLabel: sourceTitle,
    suggestedInsight: t('researchCapture.context.seasonalityObservation', {
      month: getLocalizedName(currentMonth),
      returnValue: formatReturn(currentMonthData.value.avgReturn),
      strongest: strongestMonth ? getLocalizedName(strongestMonth.month) : t('marketRotation.common.notAvailable'),
      weakest: weakestMonth ? getLocalizedName(weakestMonth.month) : t('marketRotation.common.notAvailable'),
    }),
    metadata: {
      sourceType: 'SEASONALITY',
      sourceTitle,
      occurredAt: new Date().toISOString(),
      metadataJson: JSON.stringify({
        window: windowLabel,
        metric: metricLabel,
        currentMonth: getLocalizedName(currentMonth),
        currentMonthAverageReturn: currentMonthData.value.avgReturn,
        strongestMonth: strongestMonth?.month ?? null,
        weakestMonth: weakestMonth?.month ?? null,
      }),
    },
    allowCompanyEvidence: false,
  })
}

const copySuccess = ref(false)

const copyToClipboard = async () => {
  const lines: string[] = []

  lines.push(`# ${t('tools.seasonality.export.title')}`)
  lines.push('')
  lines.push(`> ${t('tools.seasonality.export.disclaimer')}`)
  lines.push('')
  lines.push(`## ${t('tools.seasonality.export.monthlyOverview')}`)
  lines.push('')
  lines.push(`| ${t('tools.seasonality.month')} | ${t('tools.seasonality.avgReturn')} | ${t('tools.seasonality.characteristics')} | ${t('tools.seasonality.volatility')} |`)
  lines.push('|------|------------|-----------------|------------|')

  for (const data of monthlyData) {
    lines.push(`| ${getLocalizedShortName(data.month)} | ${formatReturn(data.avgReturn)} | ${t(data.characteristicsKey)} | ${getLocalizedVolatility(data.volatility)} |`)
  }

  lines.push('')
  lines.push('---')
  lines.push(`*${t('tools.seasonality.export.generatedBy')}*`)

  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    copySuccess.value = true
    toast.success(t('tools.seasonality.copySuccess'))
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch {
    toast.error(t('tools.seasonality.copyFailed'))
  }
}

useHead({
  title: () => `${t('tools.seasonality.title')} - ${t('nav.tools')}`,
  meta: [
    { name: 'description', content: () => t('tools.seasonality.metaDescription') }
  ]
})

definePageMeta({
  requiresAuth: false
})
</script>

<template>
  <div class="min-h-screen bg-dt-bg">
    <!-- Hero section -->
    <section class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <LedgerCard class="!p-6 sm:!p-8">
        <div class="grid gap-8 lg:grid-cols-[1.15fr_0.95fr] lg:items-center">
          <div>
            <p class="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary">{{ t('tools.seasonality.heroKicker') }}</p>
            <h1 class="text-3xl font-semibold tracking-tight text-dt-text sm:text-4xl">
              {{ t('tools.seasonality.title') }}
            </h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-dt-text-muted sm:text-base">
              {{ t('tools.seasonality.subtitle') }}
            </p>
            <BaseButton v-if="researchCapture.canCapture.value" variant="primary" class="mt-5" @click="openSeasonalityCapture">
              <Icon name="heroicons:pencil-square" class="mr-2 h-4 w-4" />
              {{ t('researchCapture.captureInsight') }}
            </BaseButton>

            <div class="mt-6 grid gap-3 sm:grid-cols-3">
              <div class="min-w-0 rounded-lg border border-dt-border bg-dt-bg p-4">
                <div class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('tools.seasonality.currentMonth') }}</div>
                <div class="mt-2 min-w-0 overflow-wrap-anywhere break-words font-data text-2xl font-semibold leading-tight text-dt-text">{{ formatReturn(currentMonthData.avgReturn) }}</div>
              </div>
              <div class="min-w-0 rounded-lg border border-dt-border bg-dt-bg p-4">
                <div class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('tools.seasonality.nextMonth') }}</div>
                <div class="mt-2 min-w-0 overflow-wrap-anywhere break-words font-data text-2xl font-semibold leading-tight text-dt-text">{{ formatReturn(nextMonthData.avgReturn) }}</div>
              </div>
              <div class="min-w-0 rounded-lg border border-dt-border bg-dt-bg p-4">
                <div class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('tools.seasonality.bestMonths') }}</div>
                <div class="mt-2 min-w-0 overflow-wrap-anywhere break-words font-data text-2xl font-semibold leading-tight text-dt-text">{{ getLocalizedName(bestMonths[0]!.month) }}</div>
              </div>
            </div>
          </div>

          <!-- Strong-period spotlight (clean panel, no gradient) -->
          <div class="rounded-xl border border-dt-border bg-dt-bg p-5">
            <div class="text-xs font-bold uppercase tracking-[0.16em] text-dt-text-muted">{{ t('tools.seasonality.bestSixMonths') }}</div>
            <div class="mt-2 overflow-wrap-anywhere break-words font-data text-4xl font-semibold leading-tight text-dt-text">{{ formatReturn(strongPeriodReturn) }}<span class="ml-1.5 text-sm font-normal text-dt-text-muted">{{ t('tools.seasonality.avgReturn') }}</span></div>
            <p class="mt-3 text-sm leading-6 text-dt-text-muted">
              {{ t(analysis.strongPeriod.descriptionKey) }}
            </p>
            <div class="mt-6 flex flex-wrap gap-2">
              <span v-for="m in strongPeriodMonths" :key="m" class="rounded-full border border-dt-border bg-dt-surface px-3 py-1.5 text-xs font-bold text-dt-text">
                {{ getLocalizedShortName(m) }}
              </span>
            </div>
          </div>
        </div>
      </LedgerCard>
    </section>

    <!-- Main content -->
    <section class="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
      <div class="min-w-0 space-y-6">
        <!-- Current & Next month highlight cards -->
        <div class="grid gap-6 xl:grid-cols-2">
          <div class="rounded-xl border border-dt-border bg-dt-surface p-5">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-dt-text-muted">{{ t('tools.seasonality.currentMonth') }}</p>
                <h2 class="mt-2 text-3xl font-semibold text-dt-text">{{ getLocalizedName(currentMonth) }}</h2>
              </div>
              <span class="rounded-full border border-dt-border bg-dt-bg px-3 py-1.5 text-xs font-bold text-dt-text">{{ getLocalizedStrength(currentMonthData.avgReturn) }}</span>
            </div>
            <div class="mt-5 text-4xl font-semibold text-dt-text">{{ formatReturn(currentMonthData.avgReturn) }}</div>
            <p class="mt-3 text-sm leading-6 text-dt-text-muted">{{ getCharacteristics(currentMonth) }}</p>
            <div class="mt-5 grid gap-2">
              <div v-for="reason in currentMonthData.possibleReasonsKeys" :key="reason" class="flex items-start gap-2.5 text-sm text-dt-text">
                <Icon name="heroicons:arrow-trending-up" class="h-4 w-4 shrink-0 text-dt-text-muted" />
                <span>{{ t(reason) }}</span>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-dt-border bg-dt-surface p-5">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-dt-text-muted">{{ t('tools.seasonality.nextMonth') }}</p>
                <h2 class="mt-2 text-3xl font-semibold text-dt-text">{{ getLocalizedName(nextMonth) }}</h2>
              </div>
              <span class="rounded-full border border-dt-border bg-dt-bg px-3 py-1.5 text-xs font-bold text-dt-text">{{ getLocalizedStrength(nextMonthData.avgReturn) }}</span>
            </div>
            <div class="mt-5 text-4xl font-semibold text-dt-text">{{ formatReturn(nextMonthData.avgReturn) }}</div>
            <p class="mt-3 text-sm leading-6 text-dt-text-muted">{{ getCharacteristics(nextMonth) }}</p>
            <div class="mt-5 grid gap-2">
              <div v-for="reason in nextMonthData.possibleReasonsKeys" :key="reason" class="flex items-start gap-2.5 text-sm text-dt-text">
                <Icon name="heroicons:arrow-path-rounded-square" class="h-4 w-4 shrink-0 text-dt-text-muted" />
                <span>{{ t(reason) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Monthly map -->
        <LedgerCard>
          <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary">{{ t('tools.seasonality.mapTitle') }}</p>
              <h3 class="text-xl font-semibold text-dt-text">{{ t('tools.seasonality.mapTitle') }}</h3>
            </div>
            <BaseButton variant="primary" class="w-full sm:w-auto" @click="copyToClipboard">
              <Icon :name="copySuccess ? 'heroicons:check' : 'heroicons:clipboard-document'" class="mr-2 h-4 w-4" />
              {{ copySuccess ? t('common.copied') : t('common.copy') }}
            </BaseButton>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="month in monthlyData"
              :key="month.month"
              class="min-w-0 rounded-lg border bg-dt-bg p-4"
              :class="month.month === currentMonth ? 'border-dt-primary' : 'border-dt-border'"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-semibold text-dt-text">
                    {{ getLocalizedName(month.month) }}
                  </div>
                  <div class="mt-1 text-xs uppercase tracking-[0.14em] text-dt-text-muted">
                    {{ getLocalizedStrength(month.avgReturn) }}
                  </div>
                </div>
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="getVolatilityColorClass(month.volatility)">
                  {{ getLocalizedVolatility(month.volatility) }}
                </span>
              </div>

              <div class="mt-4 text-2xl font-semibold" :class="getReturnColorClass(month.avgReturn)">
                {{ formatReturn(month.avgReturn) }}
              </div>
              <p class="mt-3 text-sm leading-6 text-dt-text-muted">
                {{ t(month.characteristicsKey) }}
              </p>
            </div>
          </div>
        </LedgerCard>

        <!-- Full table -->
        <LedgerCard>
          <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary">{{ t('tools.seasonality.allMonthsTable') }}</p>
              <h3 class="text-xl font-semibold text-dt-text">
                {{ t('tools.seasonality.allMonthsTable') }}
              </h3>
            </div>
            <div class="text-xs uppercase tracking-[0.16em] text-dt-text-muted">
              {{ t('tools.seasonality.dataPeriod') }}
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="border-b border-dt-border">
                  <th class="py-3 pr-4 text-left font-medium text-dt-text-muted">{{ t('tools.seasonality.month') }}</th>
                  <th class="px-4 py-3 text-right font-medium text-dt-text-muted">{{ t('tools.seasonality.avgReturn') }}</th>
                  <th class="px-4 py-3 text-left font-medium text-dt-text-muted">{{ t('tools.seasonality.characteristics') }}</th>
                  <th class="pl-4 py-3 text-center font-medium text-dt-text-muted">{{ t('tools.seasonality.volatility') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="month in monthlyData"
                  :key="month.month"
                  class="border-b border-dt-border transition-colors"
                  :class="month.month === currentMonth ? 'bg-dt-bg' : ''"
                >
                  <td class="py-4 pr-4">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-dt-text">{{ getLocalizedShortName(month.month) }}</span>
                      <span v-if="month.month === currentMonth" class="rounded-full bg-dt-primary-solid px-2 py-0.5 text-[11px] font-semibold text-white">
                        {{ t('tools.seasonality.now') }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-4 text-right font-semibold" :class="getReturnColorClass(month.avgReturn)">
                    {{ formatReturn(month.avgReturn) }}
                  </td>
                  <td class="px-4 py-4 text-dt-text-muted">
                    {{ t(month.characteristicsKey) }}
                  </td>
                  <td class="pl-4 py-4 text-center">
                    <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="getVolatilityColorClass(month.volatility)">
                      {{ getLocalizedVolatility(month.volatility) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </LedgerCard>
      </div>

      <!-- Sidebar -->
      <div class="min-w-0 space-y-6">
        <!-- Best months -->
        <LedgerCard>
          <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary">{{ t('tools.seasonality.bestMonths') }}</p>
              <h3 class="text-xl font-semibold text-dt-text">{{ t('tools.seasonality.bestMonths') }}</h3>
            </div>
            <Icon name="heroicons:arrow-trending-up" class="h-5 w-5 text-dt-success" />
          </div>

          <div class="space-y-3">
            <div v-for="(month, index) in bestMonths" :key="month.month" class="flex flex-col gap-3 rounded-lg border border-dt-border bg-dt-bg p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-3">
                <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dt-surface text-sm font-bold text-dt-accent">{{ index + 1 }}</span>
                <div>
                  <div class="text-sm font-semibold text-dt-text">{{ getLocalizedName(month.month) }}</div>
                  <div class="text-xs text-dt-text-muted">{{ getLocalizedVolatility(month.volatility) }}</div>
                </div>
              </div>
              <span class="text-lg font-semibold text-dt-success">{{ formatReturn(month.avgReturn) }}</span>
            </div>
          </div>
        </LedgerCard>

        <!-- Worst months -->
        <LedgerCard>
          <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary">{{ t('tools.seasonality.worstMonths') }}</p>
              <h3 class="text-xl font-semibold text-dt-text">{{ t('tools.seasonality.worstMonths') }}</h3>
            </div>
            <Icon name="heroicons:arrow-trending-down" class="h-5 w-5 text-dt-danger" />
          </div>

          <div class="space-y-3">
            <div v-for="(month, index) in worstMonths" :key="month.month" class="flex flex-col gap-3 rounded-lg border border-dt-border bg-dt-bg p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-3">
                <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dt-surface text-sm font-bold text-dt-danger">{{ index + 1 }}</span>
                <div>
                  <div class="text-sm font-semibold text-dt-text">{{ getLocalizedName(month.month) }}</div>
                  <div class="text-xs text-dt-text-muted">{{ getLocalizedVolatility(month.volatility) }}</div>
                </div>
              </div>
              <span class="text-lg font-semibold" :class="getReturnColorClass(month.avgReturn)">{{ formatReturn(month.avgReturn) }}</span>
            </div>
          </div>
        </LedgerCard>

        <!-- Regime view -->
        <LedgerCard :title="t('tools.seasonality.regimeViewTitle')">
          <div class="mt-5 grid gap-4">
            <div class="min-w-0 rounded-lg border border-dt-border bg-dt-bg p-4">
              <div class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('tools.seasonality.bestSixMonths') }}</div>
              <div class="mt-2 min-w-0 overflow-wrap-anywhere break-words font-data text-2xl font-semibold leading-tight text-dt-success">{{ formatReturn(strongPeriodReturn) }}<span class="ml-1.5 text-sm font-normal text-dt-text-muted">{{ t('tools.seasonality.avgReturn') }}</span></div>
              <p class="mt-3 text-sm leading-6 text-dt-text-muted">{{ t(analysis.strongPeriod.strategyKey) }}</p>
            </div>

            <div class="min-w-0 rounded-lg border border-dt-border bg-dt-bg p-4">
              <div class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('tools.seasonality.weakSixMonths') }}</div>
              <div class="mt-2 min-w-0 overflow-wrap-anywhere break-words font-data text-2xl font-semibold leading-tight" :class="weakPeriodReturn >= 0 ? 'text-dt-warning' : 'text-dt-danger'">
                {{ formatReturn(weakPeriodReturn) }}<span class="ml-1.5 text-sm font-normal text-dt-text-muted">{{ t('tools.seasonality.avgReturn') }}</span>
              </div>
              <p class="mt-3 text-sm leading-6 text-dt-text-muted">{{ t(analysis.weakPeriod.strategyKey) }}</p>
            </div>
          </div>
        </LedgerCard>

        <!-- Recommendations -->
        <LedgerCard :title="t('tools.seasonality.recommendations')">
          <ul class="mt-5 space-y-3">
            <li class="flex items-start gap-2.5">
              <Icon name="heroicons:check-circle" class="h-5 w-5 shrink-0 text-dt-success" />
              <span class="text-dt-text">{{ t('tools.seasonality.recommendationsList.0') }}</span>
            </li>
            <li class="flex items-start gap-2.5">
              <Icon name="heroicons:check-circle" class="h-5 w-5 shrink-0 text-dt-success" />
              <span class="text-dt-text">{{ t('tools.seasonality.recommendationsList.1') }}</span>
            </li>
            <li class="flex items-start gap-2.5">
              <Icon name="heroicons:check-circle" class="h-5 w-5 shrink-0 text-dt-success" />
              <span class="text-dt-text">{{ t('tools.seasonality.recommendationsList.2') }}</span>
            </li>
          </ul>
        </LedgerCard>

        <!-- Disclaimer -->
        <div class="flex gap-3 rounded-xl border border-dt-border bg-dt-surface p-4">
          <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 shrink-0 text-dt-warning" />
          <div>
            <p class="text-sm font-semibold text-dt-text">{{ t('tools.seasonality.disclaimerTitle') }}</p>
            <p class="mt-2 text-sm leading-6 text-dt-text-muted">{{ t('tools.seasonality.disclaimer') }}</p>
          </div>
        </div>

        <div class="text-center text-sm text-dt-text-muted">
          {{ t('tools.seasonality.dataSource') }}
        </div>
      </div>
    </section>
    <ResearchCaptureModal :capture="researchCapture" />
  </div>
</template>

<style scoped>
</style>
