import { computed, ref } from 'vue'
import { useDebounceFn, useLocalStorage } from '@vueuse/core'
import {
  createEmptyQuickNoteTemplateData,
  type QuickNoteTemplateData,
  type QuickNoteTemplateKind,
} from '~/types/quicknote'

export interface QuickNoteDraft {
  title: string
  content: string
  tags: string[]
  date: string
  templateKind: QuickNoteTemplateKind
  templateData: QuickNoteTemplateData
  savedAt: string
}

const DRAFT_KEY = 'quick-note-draft'
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000

export function useQuickNoteDraft() {
  const draft = useLocalStorage<QuickNoteDraft>(DRAFT_KEY, {
    title: '',
    content: '',
    tags: [],
    date: '',
    templateKind: 'blank',
    templateData: createEmptyQuickNoteTemplateData(),
    savedAt: ''
  })

  const lastSavedAt = ref('')

  const hasDraft = computed(() => {
    if (!draft.value.savedAt) return false
    const savedAt = new Date(draft.value.savedAt).getTime()
    if (!Number.isFinite(savedAt)) return false
    if (Date.now() - savedAt > DRAFT_TTL_MS) return false
    return Boolean(
      draft.value.title?.trim() ||
      draft.value.content?.trim() ||
      draft.value.tags?.length ||
      draft.value.date ||
      draft.value.templateKind !== 'blank'
    )
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
      title: '',
      content: '',
      tags: [],
      date: '',
      templateKind: 'blank',
      templateData: createEmptyQuickNoteTemplateData(),
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
