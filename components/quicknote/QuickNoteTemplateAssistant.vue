<template>
  <div v-if="templateKind !== 'blank'" class="space-y-5 rounded-2xl border p-5 shadow-sm transition-all" style="border-color: var(--color-border); background: color-mix(in srgb, var(--color-surface) 96%, white);">
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-1">
        <h3 class="text-sm font-bold" style="color: var(--color-text);">{{ t('quickDiary.templateAssistant.title') }}</h3>
        <p class="text-xs" style="color: var(--color-text-muted);">{{ t('quickDiary.templateAssistant.description') }}</p>
      </div>
      <div v-if="hasTemplateChangesPending" class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-all hover:bg-white active:scale-95"
          style="border-color: var(--color-border); background: color-mix(in srgb, var(--color-surface) 90%, white); color: var(--color-text-soft);"
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
        <div class="flex gap-2 rounded-xl border p-1" style="border-color: var(--color-border); background: white;">
          <button
            v-for="type in ['buy', 'sell', 'both']"
            :key="type"
            type="button"
            class="flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300"
            :style="templateData.tradingType === type
              ? 'background: var(--color-primary); color: white; box-shadow: var(--shadow-sm);'
              : 'color: var(--color-text-muted); hover:background: color-mix(in srgb, var(--color-surface) 90%, white);'"
            @click="updateField('tradingType', type)"
          >
            {{ type === 'buy' ? t('quickDiary.trading.buy') : type === 'sell' ? t('quickDiary.trading.sell') : t('quickDiary.trading.both') }}
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
          style="border-color: var(--color-border); background: white; color: var(--color-text);"
          @input="updateField('symbols', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div>
        <label class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
          {{ t('quickDiary.trading.marketFeeling') }}
        </label>
        <div class="flex gap-2 rounded-xl border p-1" style="border-color: var(--color-border); background: white;">
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
          style="border-color: var(--color-border); background: white; color: var(--color-text);"
          @input="updateField('note', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>

    <div v-else-if="templateKind === 'reflection'" class="grid gap-5 sm:grid-cols-2">
      <div>
        <label class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
          {{ t('quickDiary.reflection.marketCondition') }}
        </label>
        <select
          :value="selectedReflectionMarketCondition"
          class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/10"
          style="border-color: var(--color-border); background: white; color: var(--color-text);"
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
      </div>

      <div>
        <label class="mb-2.5 block text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
          {{ t('quickDiary.reflection.rating') }}
        </label>
        <div class="flex gap-1.5 rounded-xl border p-1" style="border-color: var(--color-border); background: white;">
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

      <div class="sm:col-span-2">
        <div class="flex items-center justify-between mb-2.5">
          <label class="text-[11px] font-bold uppercase tracking-wider" style="color: var(--color-text-soft);">
            {{ t('quickDiary.reflection.goodPoints') }}
          </label>
          <label class="flex items-center gap-2 cursor-pointer group">
            <input
              :checked="Boolean(templateData.noRashTrading)"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-primary transition-all focus:ring-primary/20"
              @change="updateField('noRashTrading', ($event.target as HTMLInputElement).checked)"
            />
            <span class="text-xs font-medium text-gray-600 group-hover:text-primary transition-colors">{{ t('quickDiary.reflection.noRashTrading') }}</span>
          </label>
        </div>
        <textarea
          :value="templateData.goodPoints || ''"
          rows="2"
          :placeholder="t('quickDiary.reflection.goodPointsPlaceholder')"
          class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/10"
          style="border-color: var(--color-border); background: white; color: var(--color-text);"
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
          style="border-color: var(--color-border); background: white; color: var(--color-text);"
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
          style="border-color: var(--color-border); background: white; color: var(--color-text);"
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
              : 'border-color: var(--color-border); background: white; color: var(--color-text-muted);'"
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
          style="border-color: var(--color-border); background: white; color: var(--color-text);"
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
          style="border-color: var(--color-border); background: white; color: var(--color-text);"
          @input="updateField('action', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  getQuickNoteObservationTypeOptions,
  getQuickNoteReflectionMarketConditionGroups,
  normalizeQuickNoteObservationType,
  normalizeQuickNoteReflectionMarketCondition,
} from '~/lib/quicknote/template-localization'
import type { QuickNoteTemplateData, QuickNoteTemplateKind } from '~/types/quicknote'

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

function updateField<K extends keyof QuickNoteTemplateData>(key: K, value: QuickNoteTemplateData[K]) {
  emit('update:templateData', { [key]: value })
}
</script>
