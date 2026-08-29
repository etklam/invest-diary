<template>
  <div v-if="templateKind !== 'blank'" class="space-y-5 rounded-2xl border p-5 shadow-sm transition-all" style="border-color: var(--color-border); background: var(--color-surface);">
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-1">
        <h3 class="text-sm font-bold" style="color: var(--color-text);">{{ t('quickDiary.templateAssistant.title') }}</h3>
        <p class="text-xs" style="color: var(--color-text-muted);">{{ t('quickDiary.templateAssistant.description') }}</p>
      </div>
      <div v-if="hasTemplateChangesPending" class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-all hover:opacity-90 active:scale-95"
          style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-soft);"
          @click="emit('apply-template-changes')"
        >
          {{ t('quickDiary.templateAssistant.applyChanges') }}
        </button>
        <button
          type="button"
          class="rounded-xl px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
          style="background: var(--color-primary);"
          @click="emit('regenerate-template')"
        >
          {{ t('quickDiary.templateAssistant.regenerate') }}
        </button>
      </div>
    </div>

    <div v-if="templateKind === 'trading'" class="grid gap-5 sm:grid-cols-2">
      <div class="sm:col-span-2">
        <label class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
          {{ t('quickDiary.trading.operation') }}
        </label>
        <div class="flex gap-2 rounded-xl border p-1" style="border-color: var(--color-border); background: var(--color-surface-muted);">
          <button
            v-for="type in ['buy', 'sell', 'both', 'none']"
            :key="type"
            type="button"
            class="flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300"
            :style="templateData.tradingType === type
              ? 'background: var(--color-primary); color: white; box-shadow: var(--shadow-sm);'
              : 'color: var(--color-text-muted); hover:background: color-mix(in srgb, var(--color-surface) 90%, white);'"
            @click="updateField('tradingType', type)"
          >
            {{ type === 'buy' ? t('quickDiary.trading.buy') : type === 'sell' ? t('quickDiary.trading.sell') : type === 'both' ? t('quickDiary.trading.both') : t('quickDiary.trading.none') }}
          </button>
        </div>
      </div>

      <div>
        <label class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
          {{ t('quickDiary.trading.symbols') }}
        </label>
        <input
          :value="templateData.symbols || ''"
          type="text"
          :placeholder="t('quickDiary.trading.symbolsPlaceholder')"
          class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/10"
          style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
          @input="updateField('symbols', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div>
        <label class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
          {{ t('quickDiary.trading.marketFeeling') }}
        </label>
        <div class="flex gap-2 rounded-xl border p-1" style="border-color: var(--color-border); background: var(--color-surface-muted);">
          <button
            v-for="mood in ['bullish', 'bearish', 'neutral']"
            :key="mood"
            type="button"
            class="flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300"
            :style="templateData.marketMood === mood
              ? 'background: var(--color-primary); color: white; box-shadow: var(--shadow-sm);'
              : 'color: var(--color-text-muted); hover:background: color-mix(in srgb, var(--color-surface) 90%, white);'"
            @click="updateField('marketMood', mood)"
          >
            {{ mood === 'bullish' ? t('quickDiary.trading.bullish') : mood === 'bearish' ? t('quickDiary.trading.bearish') : t('quickDiary.trading.neutral') }}
          </button>
        </div>
      </div>

      <div class="sm:col-span-2">
        <label class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
          {{ t('quickDiary.trading.note') }}
        </label>
        <textarea
          :value="templateData.note || ''"
          rows="2"
          :placeholder="t('quickDiary.trading.notePlaceholder')"
          class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/10"
          style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
          @input="updateField('note', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>

    <div v-else-if="templateKind === 'reflection'" class="grid gap-5 sm:grid-cols-2">
      <div>
        <label class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
          {{ t('quickDiary.reflection.marketCondition') }}
        </label>
        <div class="space-y-2.5">
          <select
            :value="selectedReflectionMarketCondition"
            class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/10"
            style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
            @change="updateField('marketCondition', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ t('quickDiary.reflection.selectCondition') }}</option>
            <optgroup
              v-for="group in reflectionMarketConditionGroups"
              :key="group.label"
              :label="group.label"
            >
              <option
                v-for="option in group.options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </optgroup>
          </select>

          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            style="border-color: color-mix(in srgb, var(--color-primary) 28%, var(--color-border)); background: color-mix(in srgb, var(--color-primary) 9%, var(--color-surface-muted)); color: var(--color-primary);"
            :disabled="spxPending"
            @click="applySpxMarketCondition"
          >
            <Icon v-if="spxPending" name="heroicons:arrow-path" class="h-3.5 w-3.5 animate-spin" />
            <Icon v-else name="heroicons:chart-bar-square" class="h-3.5 w-3.5" />
            {{ spxPending ? t('quickDiary.reflection.spx.loading') : t('quickDiary.reflection.spx.button') }}
          </button>

          <p v-if="spxSummary" class="text-[11px] leading-relaxed" style="color: var(--color-text-muted);">
            {{ t('quickDiary.reflection.spx.applied', { change: formatSignedPercent(spxSummary.changePercent), condition: spxConditionLabel }) }}
          </p>
          <p v-else-if="spxError" class="text-[11px] leading-relaxed" style="color: var(--color-negative);">
            {{ spxError }}
          </p>
        </div>
      </div>

      <div>
        <label class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
          {{ t('quickDiary.reflection.rating') }}
        </label>
        <div class="flex gap-1.5 rounded-xl border p-1" style="border-color: var(--color-border); background: var(--color-surface-muted);">
          <button
            v-for="rating in [1, 2, 3, 4, 5]"
            :key="rating"
            type="button"
            class="flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-300"
            :style="templateData.rating === rating
              ? 'background: var(--color-primary); color: white; box-shadow: var(--shadow-sm);'
              : 'color: var(--color-text-muted); hover:background: color-mix(in srgb, var(--color-surface) 90%, white);'"
            @click="updateField('rating', rating)"
          >
            {{ rating }}
          </button>
        </div>
      </div>

      <!-- 相關交易選擇器 -->
      <div class="sm:col-span-2">
        <div class="flex items-center justify-between mb-2.5">
          <label class="text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
            {{ t('quickDiary.reflection.relatedTrades') }}
          </label>
          <span v-if="selectedTradeCount > 0" class="text-[10px] font-semibold rounded-full px-2 py-0.5" style="background: var(--color-primary); color: white;">
            {{ t('quickDiary.reflection.relatedTradesSelected', { count: selectedTradeCount }) }}
          </span>
        </div>
        <div
          v-if="recentTradesPending"
          class="flex items-center gap-2 rounded-xl border px-4 py-3 text-xs"
          style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-muted);"
        >
          <Icon name="heroicons:arrow-path" class="h-3.5 w-3.5 animate-spin" />
          {{ t('quickDiary.reflection.loadingTrades') }}
        </div>
        <div
          v-else-if="!recentTrades.length"
          class="rounded-xl border px-4 py-3 text-xs"
          style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-soft);"
        >
          {{ t('quickDiary.reflection.noRecentTrades') }}
        </div>
        <div
          v-else
          class="rounded-xl border overflow-hidden"
          style="border-color: var(--color-border);"
        >
          <label
            v-for="trade in recentTrades"
            :key="trade.id"
            class="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-opacity-60"
            :style="isTradeSelected(trade.id)
              ? 'background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-muted));'
              : 'background: var(--color-surface-muted);'"
          >
            <input
              :checked="isTradeSelected(trade.id)"
              type="checkbox"
              class="h-4 w-4 rounded border-dt-border text-dt-primary flex-shrink-0 focus:ring-primary/20"
              @change="toggleTrade(trade, ($event.target as HTMLInputElement).checked)"
            />
            <div class="flex flex-1 items-center justify-between gap-2 min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs font-bold tracking-wide flex-shrink-0" style="color: var(--color-text);">{{ trade.symbol }}</span>
                <span class="text-[10px] flex-shrink-0" style="color: var(--color-text-muted);">{{ formatTradeDate(trade.sellDate) }}</span>
                <span class="text-[10px] truncate" style="color: var(--color-text-soft);">×{{ trade.sellQuantity }}</span>
              </div>
              <span
                class="text-xs font-semibold flex-shrink-0"
                :style="trade.realizedPnL >= 0 ? 'color: var(--color-positive);' : 'color: var(--color-negative);'"
              >
                {{ trade.realizedPnL >= 0 ? '+' : '' }}{{ trade.realizedPnL.toFixed(0) }}
              </span>
            </div>
          </label>
        </div>
      </div>

      <div class="sm:col-span-2">
        <div class="flex items-center justify-between mb-2.5">
          <label class="text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
            {{ t('quickDiary.reflection.goodPoints') }}
          </label>
          <label class="flex items-center gap-2 cursor-pointer group">
            <input
              :checked="Boolean(templateData.noRashTrading)"
              type="checkbox"
              class="h-4 w-4 rounded border-dt-border text-dt-primary transition-all focus:ring-primary/20"
              @change="updateField('noRashTrading', ($event.target as HTMLInputElement).checked)"
            />
            <span class="text-xs font-medium transition-colors group-hover:text-primary" style="color: var(--color-text-muted);">{{ t('quickDiary.reflection.noRashTrading') }}</span>
          </label>
        </div>
        <textarea
          :value="templateData.goodPoints || ''"
          rows="2"
          :placeholder="t('quickDiary.reflection.goodPointsPlaceholder')"
          class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/10"
          style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
          @input="updateField('goodPoints', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <div class="sm:col-span-2">
        <label class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
          {{ t('quickDiary.reflection.improvePoints') }}
        </label>
        <textarea
          :value="templateData.improvePoints || ''"
          rows="2"
          :placeholder="t('quickDiary.reflection.improvePointsPlaceholder')"
          class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/10"
          style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
          @input="updateField('improvePoints', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>

    <div v-else class="grid gap-5">
      <div>
        <label class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
          {{ t('quickDiary.observation.topic') }}
        </label>
        <input
          :value="templateData.topic || ''"
          type="text"
          :placeholder="t('quickDiary.observation.topicPlaceholder')"
          class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/10"
          style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
          @input="updateField('topic', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div>
        <label class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
          {{ t('quickDiary.observation.type') }}
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="type in observationTypeOptions"
            :key="type.value"
            type="button"
            class="rounded-xl border px-4 py-2 text-xs font-semibold transition-all duration-300"
            :style="selectedObservationType === type.value
              ? 'background: var(--color-primary); border-color: var(--color-primary); color: white; box-shadow: var(--shadow-sm);'
              : 'border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-muted);'"
            @click="updateField('observationType', type.value)"
          >
            {{ type.label }}
          </button>
        </div>
      </div>

      <div>
        <label class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
          {{ t('quickDiary.observation.content') }}
        </label>
        <textarea
          :value="templateData.observationContent || ''"
          rows="3"
          :placeholder="t('quickDiary.observation.contentPlaceholder')"
          class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/10"
          style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
          @input="updateField('observationContent', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <div>
        <label class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
          {{ t('quickDiary.observation.action') }}
        </label>
        <input
          :value="templateData.action || ''"
          type="text"
          :placeholder="t('quickDiary.observation.actionPlaceholder')"
          class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/10"
          style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
          @input="updateField('action', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFetch } from '#imports'
import {
  getQuickNoteObservationTypeOptions,
  getQuickNoteReflectionMarketConditionGroups,
  getQuickNoteReflectionMarketConditionLabel,
  normalizeQuickNoteObservationType,
  normalizeQuickNoteReflectionMarketCondition,
} from '~/lib/quicknote/template-localization'
import type { QuickNoteTemplateData, QuickNoteTemplateKind, RecentClosedTrade, RecentClosedTradesResponse } from '~/types/quicknote'

const props = defineProps<{
  templateKind: QuickNoteTemplateKind
  templateData: QuickNoteTemplateData
  hasTemplateChangesPending: boolean
}>()

const emit = defineEmits<{
  (e: 'update:templateData', value: Partial<QuickNoteTemplateData>): void
  (e: 'apply-template-changes'): void
  (e: 'regenerate-template'): void
}>()

const { t, locale } = useI18n()

const currentLocale = computed(() => locale.value || 'en')
const reflectionMarketConditionGroups = computed(() => getQuickNoteReflectionMarketConditionGroups(currentLocale.value))
const selectedReflectionMarketCondition = computed(() => normalizeQuickNoteReflectionMarketCondition(props.templateData.marketCondition))
const observationTypeOptions = computed(() => getQuickNoteObservationTypeOptions(currentLocale.value))
const selectedObservationType = computed(() => normalizeQuickNoteObservationType(props.templateData.observationType))
const spxPending = ref(false)
const spxError = ref('')
const spxSummary = ref<{
  condition: string
  changePercent: number
} | null>(null)
const spxConditionLabel = computed(() =>
  getQuickNoteReflectionMarketConditionLabel(spxSummary.value?.condition, currentLocale.value)
)

// ── 近期交易（reflection 模板用）────────────────────────────────────────────

// 只有在 reflection 模板時才發請求（lazy: true + 手動 execute）
const { data: recentTradesData, pending: recentTradesPending, execute: fetchRecentTrades } = useFetch<RecentClosedTradesResponse>(
  '/api/stats/recent-trades',
  {
    immediate: false,
    server: false,
    default: () => ({ trades: [] }),
  }
)

const recentTrades = computed(() => recentTradesData.value?.trades ?? [])

// 當 templateKind 切換到 reflection 時，才去拉資料（避免不必要請求）
watch(
  () => props.templateKind,
  (kind) => {
    if (kind === 'reflection' && !recentTradesData.value?.trades?.length) {
      fetchRecentTrades()
    }
  },
  { immediate: true }
)

const selectedTradeIds = computed(() => new Set((props.templateData.relatedTrades ?? []).map(t => t.id)))
const selectedTradeCount = computed(() => props.templateData.relatedTrades?.length ?? 0)

function isTradeSelected(id: string): boolean {
  return selectedTradeIds.value.has(id)
}

function toggleTrade(trade: RecentClosedTrade, checked: boolean) {
  const current = props.templateData.relatedTrades ?? []
  if (checked) {
    emit('update:templateData', { relatedTrades: [...current, trade] })
  } else {
    emit('update:templateData', { relatedTrades: current.filter(t => t.id !== trade.id) })
  }
}

function formatTradeDate(iso: string): string {
  return iso.slice(0, 10)
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

// ── 通用 ─────────────────────────────────────────────────────────────────────

function updateField<K extends keyof QuickNoteTemplateData>(key: K, value: QuickNoteTemplateData[K]) {
  emit('update:templateData', { [key]: value })
}

async function applySpxMarketCondition() {
  spxPending.value = true
  spxError.value = ''
  try {
    const summary = await $fetch<{
      condition: string
      changePercent: number
    }>('/api/market/spx-session')
    spxSummary.value = summary
    emit('update:templateData', { marketCondition: summary.condition })
  } catch {
    spxError.value = t('quickDiary.reflection.spx.error')
  } finally {
    spxPending.value = false
  }
}
</script>
