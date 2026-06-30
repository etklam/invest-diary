<template>
  <div
    class="rounded-2xl border p-5 shadow-sm md:p-6"
    style="border-color: var(--color-border); background: var(--color-surface); box-shadow: var(--shadow-sm);"
  >
    <div class="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-start md:justify-between" style="border-color: var(--color-border);">
      <div v-if="!isCompact" class="space-y-1">
        <p
          class="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style="color: var(--color-secondary); font-family: var(--font-body);"
        >
          {{ t('quickDiary.editor.eyebrow') }}
        </p>
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-semibold" style="color: var(--color-text); font-family: var(--font-display);">{{ t('quickDiary.title') }}</h2>
          <span
            v-if="draftHint"
            class="rounded-full px-3 py-1 text-[11px] font-semibold"
            style="background: color-mix(in srgb, var(--color-accent) 14%, var(--color-surface-muted)); color: var(--color-accent);"
          >
            {{ draftHint }}
          </span>
        </div>
        <p class="text-sm" style="color: var(--color-text-muted);">
          {{ t('quickDiary.editor.intro') }}
        </p>
      </div>

      <div v-if="!isCompact" class="space-y-2 md:max-w-[320px]">
        <p class="text-xs font-semibold uppercase tracking-[0.14em]" style="color: var(--color-text-soft);">
          {{ t('quickDiary.editor.saveModeLabel') }}
        </p>
        <div
          class="grid grid-cols-2 gap-2 rounded-2xl border p-1.5"
          style="border-color: var(--color-border); background: color-mix(in srgb, var(--color-surface-strong) 72%, var(--color-background));"
        >
          <button
            v-for="option in saveModeOptions"
            :key="option.value"
            type="button"
            class="group relative rounded-xl px-4 py-3 text-left transition-all duration-300"
            :style="saveMode === option.value ? activeModeStyle : inactiveModeStyle"
            @click="emit('update:save-mode', option.value)"
          >
            <span class="block text-sm font-bold tracking-tight">{{ option.label }}</span>
            <span class="mt-1 block text-[11px] leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">{{ option.description }}</span>
            <div
              v-if="saveMode === option.value"
              class="absolute inset-0 rounded-xl ring-2 ring-inset ring-white/20"
            />
          </button>
        </div>
      </div>
    </div>

    <div
      class="mt-6 grid gap-6"
      :class="isCompact ? '' : 'lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start'"
    >
      <div class="space-y-5">
        <div class="grid gap-3.5">
          <input
            :value="title"
            type="text"
            class="w-full rounded-2xl border px-5 py-4 text-sm font-medium shadow-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
            :placeholder="t('diary.diaryTitle')"
            :aria-label="t('quickDiary.editor.titleAria')"
            @input="handleTitleInput"
          />

          <textarea
            :value="content"
            class="min-h-[200px] w-full rounded-2xl border px-4 py-3.5 text-sm leading-7 shadow-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/20 sm:min-h-[260px] sm:px-5 sm:py-4 sm:leading-8"
            style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
            :placeholder="t('quickDiary.oneLiner.placeholder')"
            rows="8"
            :autofocus="!isCompact"
            :aria-label="t('quickDiary.editor.contentAria')"
            @input="handleContentInput"
          />
        </div>

        <!-- Compact mode hints: date + saveMode inline -->
        <div v-if="isCompact" class="flex flex-wrap items-center gap-4 text-xs" style="color: var(--color-text-muted);">
          <button
            type="button"
            class="hover:underline focus:outline-none"
            @click="$emit('toggle-date-picker')"
          >
            {{ dateHint }}
          </button>
          <span style="color: var(--color-border);">|</span>
          <button
            type="button"
            class="hover:underline focus:outline-none"
            @click="$emit('toggle-save-mode')"
          >
            {{ saveModeHintText }}
          </button>
        </div>

        <!-- Quick tools (hidden in compact) -->
        <div v-if="!isCompact" class="space-y-4 rounded-3xl border p-5 shadow-inner-sm" style="border-color: var(--color-border); background: color-mix(in srgb, var(--color-surface-strong) 68%, var(--color-background));">
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-[10px] font-bold uppercase tracking-[0.2em]" style="color: var(--color-text-soft);">{{ t('quickDiary.editor.snippets') }}</span>
            <VoiceInput @result="emit('append-text', $event)" />
            <div class="flex flex-wrap gap-2">
              <button
                v-for="template in templates"
                :key="template.id"
                type="button"
                class="rounded-full border px-4 py-2 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-primary);"
                @click="emit('apply-template', template.content)"
              >
                {{ template.name }}
              </button>
              <button
                type="button"
                class="rounded-full border px-4 py-2 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                style="border-color: color-mix(in srgb, var(--color-secondary) 30%, var(--color-border)); background: color-mix(in srgb, var(--color-secondary) 10%, var(--color-surface-muted)); color: var(--color-secondary);"
                @click="showTemplateManager = true"
              >
                {{ t('quickDiary.editor.manageTemplates') }}
              </button>
            </div>
          </div>
        </div>

        <!-- QuickTags always visible -->
        <QuickTags
          :model-value="tags"
          @update:model-value="emit('update:tags', $event)"
        />
      </div>

      <aside v-if="!isCompact" class="space-y-5">
        <section class="rounded-3xl border p-5 shadow-sm" style="border-color: var(--color-border); background: var(--color-surface);">
          <div class="space-y-4">
            <div class="flex flex-col gap-2.5">
              <label class="text-[10px] font-bold uppercase tracking-[0.2em]" style="color: var(--color-text-soft);" for="quick-note-date">
                {{ t('quickDiary.date') }}
              </label>
              <input
                id="quick-note-date"
                type="date"
                :value="date"
                class="rounded-xl border px-4 py-2.5 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-primary/10"
                style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
                @input="handleDateInput"
              />
            </div>

            <div class="space-y-3">
              <p class="text-[10px] font-bold uppercase tracking-[0.2em]" style="color: var(--color-text-soft);">{{ t('quickDiary.editor.reminders') }}</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="option in quickReminderOptions"
                  :key="option.preset"
                  type="button"
                  class="rounded-xl border px-4 py-2.5 text-xs font-medium transition-all duration-200 hover:bg-primary/5 active:scale-95"
                  style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-primary);"
                  @click="emit('set-quick-reminder', option.preset)"
                >
                  {{ option.label }}
                </button>
              </div>
              <div v-if="activeReminders.length" class="space-y-1.5 rounded-xl p-3 text-[11px]" style="background: var(--color-surface-muted); color: var(--color-text-muted);">
                <div v-for="item in activeReminders" :key="item.key" class="flex items-center justify-between">
                  <span class="font-medium">{{ item.label }}</span>
                  <span class="text-xs" style="color: var(--color-secondary);">{{ item.remaining }}</span>
                </div>
              </div>
              <QuickReminder
                :reminders="reminders"
                @set="emit('reminder-set', $event)"
                @clear="emit('reminder-clear', $event)"
              />
            </div>
          </div>
        </section>

        <section class="rounded-3xl border p-5 shadow-sm" style="border-color: color-mix(in srgb, var(--color-primary) 20%, var(--color-border)); background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-strong));">
          <div class="flex items-center gap-2 mb-3">
            <Icon name="heroicons:sparkles" class="h-4 w-4" style="color: var(--color-primary);" />
            <p class="text-[10px] font-bold uppercase tracking-[0.2em]" style="color: var(--color-primary);">{{ t('quickDiary.editor.checklistTitle') }}</p>
          </div>
          <ul class="space-y-3 text-xs leading-relaxed" style="color: var(--color-text-muted);">
            <li class="flex gap-2.5">
              <span class="h-1.5 w-1.5 mt-1.5 shrink-0 rounded-full" style="background: var(--color-primary);" />
              <span>{{ t('quickDiary.editor.checklist.title') }}</span>
            </li>
            <li class="flex gap-2.5">
              <span class="h-1.5 w-1.5 mt-1.5 shrink-0 rounded-full" style="background: var(--color-primary-soft);" />
              <span>{{ t('quickDiary.editor.checklist.append') }}</span>
            </li>
            <li class="flex gap-2.5">
              <span class="h-1.5 w-1.5 mt-1.5 shrink-0 rounded-full" style="background: var(--color-primary-soft);" />
              <span>{{ t('quickDiary.editor.checklist.create') }}</span>
            </li>
          </ul>
        </section>
      </aside>
    </div>

    <div class="mt-6 flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style="border-color: var(--color-border);">
      <div class="flex items-center gap-3">
        <div class="h-2 w-2 rounded-full animate-pulse" :style="{ background: saveMode === 'append' ? 'var(--color-secondary)' : 'var(--color-primary)' }" />
        <p class="text-xs font-medium" style="color: var(--color-text-muted);">
          {{ saveModeSummary }}
        </p>
      </div>

      <button
        class="group relative overflow-hidden rounded-2xl px-8 py-4 text-sm font-bold text-white transition-colors duration-200 hover:opacity-90 active:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
        style="background: var(--color-primary); box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 25%, transparent);"
        :disabled="saving"
        @click="emit('save')"
      >
        <span class="relative z-10 flex items-center gap-2">
          <Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
          {{ saving ? (savingLabel || t('common.loading')) : (saveLabel || t('common.save')) }}
        </span>
      </button>
    </div>

    <TemplateManager
      v-model="showTemplateManager"
      @apply="emit('apply-template', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import QuickTags from '~/components/QuickTags.vue'
import VoiceInput from '~/components/VoiceInput.vue'
import TemplateManager from '~/components/TemplateManager.vue'
import QuickReminder from '~/components/QuickReminder.vue'
import type { QuickNoteTemplate } from '~/composables/useQuickNoteTemplates'
import { createQuickReminderOptions } from '~/lib/quicknote/quick-reminders'
import type {
  QuickNoteQuickReminderPreset,
  QuickNoteReminderKey,
  QuickNoteReminders,
  QuickNoteSaveMode,
} from '~/types/quicknote'

const props = defineProps<{
  title: string
  content: string
  tags: string[]
  date: string
  saveMode: QuickNoteSaveMode
  saving: boolean
  draftHint: string
  saveLabel?: string
  savingLabel?: string
  templates: QuickNoteTemplate[]
  reminders: QuickNoteReminders
  activeReminders: Array<{
    key: string
    label: string
    remaining: string
  }>
  variant?: 'full' | 'compact'
}>()

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'update:content', value: string): void
  (e: 'update:tags', value: string[]): void
  (e: 'update:date', value: string): void
  (e: 'update:save-mode', value: QuickNoteSaveMode): void
  (e: 'append-text', value: string): void
  (e: 'apply-template', value: string): void
  (e: 'save'): void
  (e: 'set-quick-reminder', value: QuickNoteQuickReminderPreset): void
  (e: 'reminder-set', payload: { key: QuickNoteReminderKey; time: string }): void
  (e: 'reminder-clear', payload: { key: QuickNoteReminderKey }): void
  (e: 'toggle-date-picker'): void
  (e: 'toggle-save-mode'): void
}>()

const { t } = useI18n()

const showTemplateManager = ref(false)

const isCompact = computed(() => props.variant === 'compact')

const quickReminderOptions = computed(() => createQuickReminderOptions(t))

const saveModeOptions = computed<Array<{ value: QuickNoteSaveMode; label: string; description: string }>>(() => [
  {
    value: 'create',
    label: t('quickDiary.saveModes.create.label'),
    description: t('quickDiary.saveModes.create.description'),
  },
  {
    value: 'append',
    label: t('quickDiary.saveModes.append.label'),
    description: t('quickDiary.saveModes.append.description'),
  },
])

const activeModeStyle = 'background: var(--color-primary); color: white; box-shadow: var(--shadow-sm);'
const inactiveModeStyle = 'background: var(--color-surface-muted); color: var(--color-text-muted);'

const saveModeSummary = computed(() => {
  if (props.saveMode === 'append') {
    return t('quickDiary.saveModes.append.summary')
  }
  return t('quickDiary.saveModes.create.summary')
})

const dateHint = computed(() => {
  return t('quickDiary.editor.dateHint', { date: props.date })
})

const saveModeHintText = computed(() => {
  if (props.saveMode === 'append') {
    return t('quickDiary.editor.saveModeHintAppend')
  }
  return t('quickDiary.editor.saveModeHintCreate')
})

function handleContentInput(event: Event) {
  emit('update:content', (event.target as HTMLTextAreaElement).value)
}

function handleTitleInput(event: Event) {
  emit('update:title', (event.target as HTMLInputElement).value)
}

function handleDateInput(event: Event) {
  emit('update:date', (event.target as HTMLInputElement).value)
}
</script>
