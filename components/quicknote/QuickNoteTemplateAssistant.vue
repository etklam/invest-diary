<template>
  <div v-if="templateKind !== 'blank'" class="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200">模板助手</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">模板欄位會更新建議標題與內容，仍可自由編輯。</p>
      </div>
      <div v-if="hasTemplateChangesPending" class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          @click="emit('apply-template-changes')"
        >
          套用模板變更
        </button>
        <button
          type="button"
          class="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200"
          @click="emit('regenerate-template')"
        >
          重新產生模板內容
        </button>
      </div>
    </div>

    <div v-if="templateKind === 'trading'" class="space-y-4">
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('quickDiary.trading.operation') }}
        </label>
        <div class="flex gap-2">
          <button
            v-for="type in ['buy', 'sell', 'both']"
            :key="type"
            type="button"
            class="flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200"
            :class="templateData.tradingType === type
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'border border-gray-300/60 bg-white/70 text-gray-700 hover:bg-white dark:border-gray-600/60 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-800/80'"
            @click="updateField('tradingType', type)"
          >
            {{ type === 'buy' ? t('quickDiary.trading.buy') : type === 'sell' ? t('quickDiary.trading.sell') : t('quickDiary.trading.both') }}
          </button>
        </div>
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('quickDiary.trading.symbols') }}
        </label>
        <input
          :value="templateData.symbols || ''"
          type="text"
          :placeholder="t('quickDiary.trading.symbolsPlaceholder')"
          class="w-full rounded-xl border border-gray-300/60 bg-white/70 px-4 py-3 text-sm text-gray-700 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 dark:border-gray-600/60 dark:bg-gray-800/60 dark:text-white"
          @input="updateField('symbols', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('quickDiary.trading.marketFeeling') }}
        </label>
        <div class="flex gap-2">
          <button
            v-for="mood in ['bullish', 'bearish', 'neutral']"
            :key="mood"
            type="button"
            class="flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200"
            :class="templateData.marketMood === mood
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'border border-gray-300/60 bg-white/70 text-gray-700 hover:bg-white dark:border-gray-600/60 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-800/80'"
            @click="updateField('marketMood', mood)"
          >
            {{ mood === 'bullish' ? t('quickDiary.trading.bullish') : mood === 'bearish' ? t('quickDiary.trading.bearish') : t('quickDiary.trading.neutral') }}
          </button>
        </div>
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('quickDiary.trading.note') }}
        </label>
        <textarea
          :value="templateData.note || ''"
          rows="3"
          :placeholder="t('quickDiary.trading.notePlaceholder')"
          class="w-full rounded-xl border border-gray-300/60 bg-white/70 px-4 py-3 text-sm text-gray-700 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 dark:border-gray-600/60 dark:bg-gray-800/60 dark:text-white"
          @input="updateField('note', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>

    <div v-else-if="templateKind === 'reflection'" class="space-y-4">
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('quickDiary.reflection.marketCondition') }}
        </label>
        <select
          :value="templateData.marketCondition || ''"
          class="w-full rounded-xl border border-gray-300/60 bg-white/70 px-4 py-3 text-sm text-gray-700 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 dark:border-gray-600/60 dark:bg-gray-800/60 dark:text-white"
          @change="updateField('marketCondition', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">{{ t('quickDiary.reflection.selectCondition') }}</option>
          <optgroup :label="isZhLocale ? '漲跌' : 'Price Change'">
            <option value="大漲">大漲</option>
            <option value="小漲">小漲</option>
            <option value="盤整">盤整</option>
            <option value="小跌">小跌</option>
            <option value="大跌">大跌</option>
          </optgroup>
          <optgroup :label="isZhLocale ? '走勢型態' : 'Trend Pattern'">
            <option value="高開高走">高開高走</option>
            <option value="高開低走">高開低走</option>
            <option value="低開高走">低開高走</option>
            <option value="低開低走">低開低走</option>
            <option value="震盪">震盪</option>
          </optgroup>
          <optgroup :label="isZhLocale ? '市場結構' : 'Market Structure'">
            <option value="個股分化">個股分化</option>
            <option value="齊漲">齊漲</option>
            <option value="齊跌">齊跌</option>
            <option value="指數穩個股弱">指數穩、個股弱</option>
            <option value="指數弱個股強">指數弱、個股強</option>
          </optgroup>
        </select>
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('quickDiary.reflection.rating') }}
        </label>
        <div class="flex gap-2">
          <button
            v-for="rating in [1, 2, 3, 4, 5]"
            :key="rating"
            type="button"
            class="flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200"
            :class="templateData.rating === rating
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'border border-gray-300/60 bg-white/70 text-gray-700 hover:bg-white dark:border-gray-600/60 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-800/80'"
            @click="updateField('rating', rating)"
          >
            {{ rating }}⭐
          </button>
        </div>
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('quickDiary.reflection.goodPoints') }}
        </label>
        <label class="mb-2 flex items-center gap-2 cursor-pointer">
          <input
            :checked="Boolean(templateData.noRashTrading)"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/50"
            @change="updateField('noRashTrading', ($event.target as HTMLInputElement).checked)"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">{{ t('quickDiary.reflection.noRashTrading') }}</span>
        </label>
        <textarea
          :value="templateData.goodPoints || ''"
          rows="2"
          :placeholder="t('quickDiary.reflection.goodPointsPlaceholder')"
          class="w-full rounded-xl border border-gray-300/60 bg-white/70 px-4 py-3 text-sm text-gray-700 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 dark:border-gray-600/60 dark:bg-gray-800/60 dark:text-white"
          @input="updateField('goodPoints', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('quickDiary.reflection.improvePoints') }}
        </label>
        <textarea
          :value="templateData.improvePoints || ''"
          rows="2"
          :placeholder="t('quickDiary.reflection.improvePointsPlaceholder')"
          class="w-full rounded-xl border border-gray-300/60 bg-white/70 px-4 py-3 text-sm text-gray-700 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 dark:border-gray-600/60 dark:bg-gray-800/60 dark:text-white"
          @input="updateField('improvePoints', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>

    <div v-else class="space-y-4">
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('quickDiary.observation.topic') }}
        </label>
        <input
          :value="templateData.topic || ''"
          type="text"
          :placeholder="t('quickDiary.observation.topicPlaceholder')"
          class="w-full rounded-xl border border-gray-300/60 bg-white/70 px-4 py-3 text-sm text-gray-700 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 dark:border-gray-600/60 dark:bg-gray-800/60 dark:text-white"
          @input="updateField('topic', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('quickDiary.observation.type') }}
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="type in observationTypes"
            :key="type"
            type="button"
            class="rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200"
            :class="templateData.observationType === type
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'border border-gray-300/60 bg-white/70 text-gray-700 hover:bg-white dark:border-gray-600/60 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-800/80'"
            @click="updateField('observationType', type)"
          >
            {{ type }}
          </button>
        </div>
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('quickDiary.observation.content') }}
        </label>
        <textarea
          :value="templateData.observationContent || ''"
          rows="4"
          :placeholder="t('quickDiary.observation.contentPlaceholder')"
          class="w-full rounded-xl border border-gray-300/60 bg-white/70 px-4 py-3 text-sm text-gray-700 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 dark:border-gray-600/60 dark:bg-gray-800/60 dark:text-white"
          @input="updateField('observationContent', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('quickDiary.observation.action') }}
        </label>
        <input
          :value="templateData.action || ''"
          type="text"
          :placeholder="t('quickDiary.observation.actionPlaceholder')"
          class="w-full rounded-xl border border-gray-300/60 bg-white/70 px-4 py-3 text-sm text-gray-700 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 dark:border-gray-600/60 dark:bg-gray-800/60 dark:text-white"
          @input="updateField('action', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

const isZhLocale = computed(() => locale.value === 'zh-TW' || locale.value === 'zh-CN')

const observationTypes = computed(() => (
  isZhLocale.value
    ? ['板塊熱點', '個股走勢', '市場消息', '技術分析', '其他']
    : ['Sector momentum', 'Individual stock trend', 'Market news', 'Technical analysis', 'Other']
))

function updateField<K extends keyof QuickNoteTemplateData>(key: K, value: QuickNoteTemplateData[K]) {
  emit('update:templateData', { [key]: value })
}
</script>
