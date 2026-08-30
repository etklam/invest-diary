<template>
  <div class="space-y-3 rounded-lg border border-dt-border bg-dt-surface p-4 text-sm text-dt-text">
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-semibold">{{ t('quickDiary.reminders.customTitle') }}</h4>
      <p class="text-xs text-dt-text-soft">{{ t('quickDiary.reminders.singleHint') }}</p>
    </div>

    <div class="space-y-2">
      <div class="space-y-2">
        <div class="grid grid-cols-2 gap-2">
          <input
            v-model="form.reminder1.date"
            type="date"
            class="w-full min-w-0 rounded-md border border-dt-border bg-dt-surface px-2 py-1 text-xs text-dt-text"
            :aria-label="t('quickDiary.reminders.dateLabel')"
          />
          <input
            v-model="form.reminder1.time"
            type="time"
            class="w-full min-w-0 rounded-md border border-dt-border bg-dt-surface px-2 py-1 text-xs text-dt-text"
            :aria-label="t('quickDiary.reminders.timeLabel')"
          />
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-dt-primary/20 bg-dt-primary/10 px-2 py-1 text-xs text-dt-primary hover:bg-dt-primary/20"
            @click="apply()"
          >
            {{ t('quickDiary.reminders.apply') }}
          </button>
          <button
            type="button"
            class="rounded-md border border-dt-border bg-dt-surface px-2 py-1 text-xs text-dt-text-muted hover:border-dt-border-strong"
            @click="clear()"
          >
            {{ t('quickDiary.reminders.clear') }}
          </button>
        </div>
      </div>
      <p v-if="reminderPreview" class="text-xs text-dt-text-soft">
        {{ t('quickDiary.reminders.previewAt', { time: reminderPreview }) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

const { t } = useI18n()
const { formatLocaleDateTime } = useTimezone()

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
  return formatLocaleDateTime(parsed)
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
