import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

type ReminderKey = 'reminder1' | 'reminder2' | 'reminder3'

interface ReminderState {
  reminder1: string | null
  reminder2: string | null
  reminder3: string | null
}

const REMINDER_KEY = 'quick-note-reminders'

export function useQuickNoteReminders() {
  const reminders = useLocalStorage<ReminderState>(REMINDER_KEY, {
    reminder1: null,
    reminder2: null,
    reminder3: null
  })

  const setReminder = (key: ReminderKey, time: string | null) => {
    reminders.value = { ...reminders.value, [key]: time }
  }

  const clearReminder = (key: ReminderKey) => {
    reminders.value = { ...reminders.value, [key]: null }
  }

  const nextReminder = computed(() => {
    const entries = Object.entries(reminders.value)
      .map(([key, value]) => ({ key: key as ReminderKey, time: value ? new Date(value).getTime() : null }))
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
    ;(['reminder1', 'reminder2', 'reminder3'] as ReminderKey[]).forEach(key => {
      const time = reminders.value[key]
      if (!time) return
      const target = new Date(time).getTime()
      if (!Number.isFinite(target)) {
        clearReminder(key)
        return
      }
      if (now >= target) {
        showToast('快速筆記提醒：該記錄一下了')
        clearReminder(key)
      }
    })
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
