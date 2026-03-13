import { computed, ref } from 'vue'
import { useDebounceFn, useLocalStorage } from '@vueuse/core'

export interface QuickNoteDraft {
  content: string
  tags: string[]
  date: string
  savedAt: string
}

const DRAFT_KEY = 'quick-note-draft'
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000

export function useQuickNoteDraft() {
  const draft = useLocalStorage<QuickNoteDraft>(DRAFT_KEY, {
    content: '',
    tags: [],
    date: '',
    savedAt: ''
  })

  const lastSavedAt = ref('')

  const hasDraft = computed(() => {
    if (!draft.value.savedAt) return false
    const savedAt = new Date(draft.value.savedAt).getTime()
    if (!Number.isFinite(savedAt)) return false
    if (Date.now() - savedAt > DRAFT_TTL_MS) return false
    return Boolean(draft.value.content?.trim() || draft.value.tags?.length || draft.value.date)
  })

  const saveDraft = useDebounceFn((data: Partial<QuickNoteDraft>) => {
    draft.value = {
      ...draft.value,
      ...data,
      savedAt: new Date().toISOString()
    }
    lastSavedAt.value = draft.value.savedAt
  }, 1000)

  const clearDraft = () => {
    draft.value = {
      content: '',
      tags: [],
      date: '',
      savedAt: ''
    }
    lastSavedAt.value = ''
  }

  return {
    draft,
    hasDraft,
    lastSavedAt,
    saveDraft,
    clearDraft
  }
}
