import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import type { QuickNoteReminderKey, QuickNoteReminders } from '~/types/quicknote'

const REMINDER_KEY = 'quick-note-reminders'

export function useQuickNoteReminders() {
  const reminders = useLocalStorage<QuickNoteReminders>(REMINDER_KEY, {
    reminder1: null,
  })

  const setReminder = (key: QuickNoteReminderKey, time: string | null) => {
    reminders.value = { ...reminders.value, [key]: time }
  }

  const clearReminder = (key: QuickNoteReminderKey) => {
    reminders.value = { ...reminders.value, [key]: null }
  }

  const nextReminder = computed(() => {
    const entries = Object.entries(reminders.value)
      .map(([key, value]) => ({ key: key as QuickNoteReminderKey, time: value ? new Date(value).getTime() : null }))
      .filter(item => item.time && Number.isFinite(item.time))
      .sort((a, b) => (a.time as number) - (b.time as number))
    return entries[0] || null
  })

  const showToast = (message: string) => {
    if (!process.client) return
    const toast = useToast()
    toast.info(message, 6000)
  }

  const checkReminders = () => {
    if (!process.client) return
    const now = Date.now()
    const time = reminders.value.reminder1
    if (!time) return
    const target = new Date(time).getTime()
    if (!Number.isFinite(target)) {
      clearReminder('reminder1')
      return
    }
    if (now >= target) {
      showToast('快速筆記提醒：該記錄一下了')
      clearReminder('reminder1')
    }
  }

  return {
    reminders,
    nextReminder,
    setReminder,
    clearReminder,
    checkReminders,
    showToast
  }
}
