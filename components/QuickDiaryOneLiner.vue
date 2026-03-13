<template>
  <div class="p-4 space-y-6">
    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">快速筆記</h2>
        <span v-if="draftHint" class="text-xs text-gray-500 dark:text-gray-400">{{ draftHint }}</span>
      </div>

      <textarea
        v-model="content"
        class="mt-3 w-full rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        :placeholder="t('quickDiary.oneLiner.placeholder')"
        rows="4"
        autofocus
        aria-label="快速筆記內容"
      />

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <VoiceInput @result="appendText" />
        <div class="flex flex-wrap gap-2">
          <button
            v-for="template in templates"
            :key="template.id"
            type="button"
            class="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            @click="applyTemplate(template.content)"
          >
            {{ template.name }}
          </button>
          <button
            type="button"
            class="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200"
            @click="showTemplateManager = true"
          >
            管理模板
          </button>
        </div>
      </div>

      <div class="mt-4">
        <QuickTags v-model="tags" />
      </div>

      <div class="mt-4 space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-gray-500 dark:text-gray-400">快速提醒</span>
          <button
            v-for="option in quickReminderOptions"
            :key="option.hours"
            type="button"
            class="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            @click="setQuickReminder(option.hours)"
          >
            {{ option.label }}
          </button>
        </div>
        <div v-if="activeReminders.length" class="space-y-1 text-xs text-gray-500 dark:text-gray-400">
          <div v-for="item in activeReminders" :key="item.key">
            {{ item.label }}：剩餘 {{ item.remaining }}
          </div>
        </div>
        <QuickReminder
          :reminders="reminders"
          @set="handleReminderSet"
          @clear="handleReminderClear"
        />
      </div>

      <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-500 dark:text-gray-400" for="quick-note-date">日期</label>
          <input
            id="quick-note-date"
            type="date"
            v-model="date"
            class="rounded-md border border-gray-200 bg-white p-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <button
          class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? t('common.loading') : t('common.save') }}
        </button>
      </div>
    </div>

    <TemplateManager v-model="showTemplateManager" @apply="applyTemplate" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import QuickTags from '~/components/QuickTags.vue'
import VoiceInput from '~/components/VoiceInput.vue'
import TemplateManager from '~/components/TemplateManager.vue'
import QuickReminder from '~/components/QuickReminder.vue'
import { useQuickNoteDraft } from '~/composables/useQuickNoteDraft'
import { useQuickNoteTemplates } from '~/composables/useQuickNoteTemplates'
import { useQuickNoteReminders } from '~/composables/useQuickNoteReminders'

const { t } = useI18n()
const { getTodayDateString } = useTimezone()
const toast = useToast()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const content = ref('')
const tags = ref<string[]>([])
const date = ref(getTodayDateString())
const saving = ref(false)
const readyForAutosave = ref(false)
const showTemplateManager = ref(false)

const { draft, hasDraft, lastSavedAt, saveDraft, clearDraft } = useQuickNoteDraft()
const { templates } = useQuickNoteTemplates()
const { reminders, setReminder, clearReminder, checkReminders } = useQuickNoteReminders()

const quickReminderOptions = [
  { hours: 1, label: '1 小時' },
  { hours: 2, label: '2 小時' },
  { hours: 4, label: '4 小時' }
]

const draftHint = computed(() => {
  if (!lastSavedAt.value) return ''
  return '草稿已儲存'
})

const nowTick = ref(Date.now())

const activeReminders = computed(() => {
  const now = nowTick.value
  const items = (['reminder1', 'reminder2', 'reminder3'] as const)
    .map((key, index) => {
      const time = reminders.value[key]
      if (!time) return null
      const target = new Date(time).getTime()
      if (!Number.isFinite(target) || target <= now) return null
      return {
        key,
        label: `提醒 ${index + 1}`,
        remaining: formatRemaining(target - now)
      }
    })
    .filter(Boolean) as { key: string; label: string; remaining: string }[]
  return items
})

function appendText(text: string) {
  const next = [content.value, text].filter(Boolean).join(' ')
  content.value = next.trim()
}

function applyTemplate(templateContent: string) {
  if (!templateContent) return
  if (content.value.trim()) {
    const replace = confirm('已有內容，是否用模板覆蓋？')
    if (replace) {
      content.value = templateContent
      return
    }
  }
  content.value = [content.value, templateContent].filter(Boolean).join('\n\n').trim()
}

async function save() {
  if (!content.value.trim()) {
    toast.warning('請先輸入內容')
    return
  }
  saving.value = true
  try {
    await $fetch('/api/diaries', {
      method: 'POST',
      body: {
        title: 'Quick Diary',
        content: content.value,
        date: `${date.value}T12:00:00.000Z`,
        tags: tags.value,
      },
    })
    content.value = ''
    tags.value = []
    date.value = getTodayDateString()
    clearDraft()
    toast.success('已儲存快速筆記')
    emit('saved')
  } catch (error: any) {
    toast.error(error.data?.statusMessage || '儲存失敗')
  } finally {
    saving.value = false
  }
}

function setQuickReminder(hours: number) {
  const now = Date.now()
  const target = new Date(now + hours * 60 * 60 * 1000).toISOString()
  const keys = ['reminder1', 'reminder2', 'reminder3'] as const
  const emptyKey = keys.find(key => !reminders.value[key])
  const targetKey = emptyKey || 'reminder3'
  setReminder(targetKey, target)
  toast.info(`已設定 ${hours} 小時後提醒`)
}

function handleReminderSet(payload: { key: 'reminder1' | 'reminder2' | 'reminder3'; time: string }) {
  setReminder(payload.key, payload.time)
  toast.info('提醒已設定')
}

function handleReminderClear(payload: { key: 'reminder1' | 'reminder2' | 'reminder3' }) {
  clearReminder(payload.key)
  toast.info('提醒已清除')
}

function formatRemaining(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000))
  if (totalMinutes < 1) return '不到 1 分鐘'
  if (totalMinutes < 60) return `${totalMinutes} 分鐘`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes ? `${hours} 小時 ${minutes} 分鐘` : `${hours} 小時`
}

let reminderTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (hasDraft.value) {
    const shouldRestore = confirm('偵測到 24 小時內草稿，是否恢復？')
    if (shouldRestore) {
      content.value = draft.value.content || ''
      tags.value = draft.value.tags || []
      date.value = draft.value.date || getTodayDateString()
      toast.info('已恢復草稿')
    } else {
      clearDraft()
    }
  }
  readyForAutosave.value = true
  checkReminders()
  reminderTimer = setInterval(() => {
    nowTick.value = Date.now()
    checkReminders()
  }, 30000)
})

onUnmounted(() => {
  if (reminderTimer) clearInterval(reminderTimer)
})

watch(
  () => [content.value, tags.value, date.value],
  () => {
    if (!readyForAutosave.value) return
    saveDraft({
      content: content.value,
      tags: tags.value,
      date: date.value
    })
  },
  { deep: true }
)

const lastToastAt = ref(0)
watch(lastSavedAt, (val) => {
  if (!readyForAutosave.value || !val) return
  const now = Date.now()
  if (now - lastToastAt.value < 15000) return
  lastToastAt.value = now
  toast.info('草稿已儲存')
})
</script>
