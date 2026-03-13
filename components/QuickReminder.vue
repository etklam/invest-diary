<template>
  <div class="space-y-3 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-semibold">自訂提醒</h4>
      <p class="text-xs text-gray-500 dark:text-gray-400">可設定 3 組</p>
    </div>

    <div v-for="item in reminderItems" :key="item.key" class="space-y-2">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span class="w-20 text-xs text-gray-500 dark:text-gray-400">{{ item.label }}</span>
        <div class="flex flex-1 flex-col gap-2 sm:flex-row">
          <input
            v-model="form[item.key].date"
            type="date"
            class="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            :aria-label="`${item.label} 日期`"
          />
          <input
            v-model="form[item.key].time"
            type="time"
            class="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            :aria-label="`${item.label} 時間`"
          />
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200"
            @click="apply(item.key)"
          >
            設定
          </button>
          <button
            type="button"
            class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            @click="clear(item.key)"
          >
            清除
          </button>
        </div>
      </div>
      <p v-if="reminderPreview(item.key)" class="text-xs text-gray-500 dark:text-gray-400">
        提醒時間：{{ reminderPreview(item.key) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

type ReminderKey = 'reminder1' | 'reminder2' | 'reminder3'

const props = defineProps<{
  reminders: {
    reminder1: string | null
    reminder2: string | null
    reminder3: string | null
  }
}>()

const emit = defineEmits<{
  (e: 'set', payload: { key: ReminderKey; time: string }): void
  (e: 'clear', payload: { key: ReminderKey }): void
}>()

const form = reactive({
  reminder1: { date: '', time: '' },
  reminder2: { date: '', time: '' },
  reminder3: { date: '', time: '' }
})

const parseDate = (value: string | null) => {
  if (!value) return { date: '', time: '' }
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return { date: '', time: '' }
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` }
}

const syncFromProps = () => {
  form.reminder1 = { ...parseDate(props.reminders.reminder1) }
  form.reminder2 = { ...parseDate(props.reminders.reminder2) }
  form.reminder3 = { ...parseDate(props.reminders.reminder3) }
}

watch(
  () => props.reminders,
  () => syncFromProps(),
  { immediate: true, deep: true }
)

const reminderItems = [
  { key: 'reminder1' as ReminderKey, label: '提醒 1' },
  { key: 'reminder2' as ReminderKey, label: '提醒 2' },
  { key: 'reminder3' as ReminderKey, label: '提醒 3' }
]

const reminderPreview = (key: ReminderKey) => {
  const value = props.reminders[key]
  if (!value) return ''
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return ''
  return parsed.toLocaleString()
}

const apply = (key: ReminderKey) => {
  const entry = form[key]
  if (!entry.date || !entry.time) return

  // Create ISO string with proper timezone handling
  const localDateTime = `${entry.date}T${entry.time}:00`
  const time = new Date(localDateTime).toISOString()

  emit('set', { key, time })
}

const clear = (key: ReminderKey) => {
  emit('clear', { key })
}
</script>
