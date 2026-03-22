<template>
  <div class="space-y-3 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-semibold">自訂提醒</h4>
      <p class="text-xs text-gray-500 dark:text-gray-400">可設定 1 組</p>
    </div>

    <div class="space-y-2">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div class="flex flex-1 flex-col gap-2 sm:flex-row">
          <input
            v-model="form.reminder1.date"
            type="date"
            class="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            aria-label="提醒日期"
          />
          <input
            v-model="form.reminder1.time"
            type="time"
            class="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            aria-label="提醒時間"
          />
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200"
            @click="apply()"
          >
            設定
          </button>
          <button
            type="button"
            class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            @click="clear()"
          >
            清除
          </button>
        </div>
      </div>
      <p v-if="reminderPreview" class="text-xs text-gray-500 dark:text-gray-400">
        提醒時間：{{ reminderPreview }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

const props = defineProps<{
  reminders: {
    reminder1: string | null
  }
}>()

const emit = defineEmits<{
  (e: 'set', payload: { key: 'reminder1'; time: string }): void
  (e: 'clear', payload: { key: 'reminder1' }): void
}>()

const form = reactive({
  reminder1: { date: '', time: '' },
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
}

watch(
  () => props.reminders,
  () => syncFromProps(),
  { immediate: true, deep: true }
)

const reminderPreview = computed(() => {
  const value = props.reminders.reminder1
  if (!value) return ''
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return ''
  return parsed.toLocaleString()
})

const apply = () => {
  const entry = form.reminder1
  if (!entry.date || !entry.time) return

  // Create ISO string with proper timezone handling
  const localDateTime = `${entry.date}T${entry.time}:00`
  const time = new Date(localDateTime).toISOString()

  emit('set', { key: 'reminder1', time })
}

const clear = () => {
  emit('clear', { key: 'reminder1' })
}
</script>
