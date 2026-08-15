import { computed, ref } from 'vue'
import { useDebounceFn, useLocalStorage } from '@vueuse/core'

export interface BlogDraft {
  title: string
  content: string
  excerpt: string
  coverImage: string
  category: string
  tags: string
  status: string
  savedAt: string
}

export type BlogDraftInput = Omit<BlogDraft, 'savedAt'>

interface UseBlogDraftOptions {
  debounceMs?: number
  onPersist?: () => void
}

export function createEmptyBlogDraft(): BlogDraft {
  return {
    title: '',
    content: '',
    excerpt: '',
    coverImage: '',
    category: '',
    tags: '',
    status: 'DRAFT',
    savedAt: '',
  }
}

export function useBlogDraft(draftKey: string, options: UseBlogDraftOptions = {}) {
  const draft = useLocalStorage<BlogDraft>(draftKey, createEmptyBlogDraft())
  const readyForAutosave = ref(false)
  const hasDraft = computed(() => Boolean(draft.value.title || draft.value.content))
  let autosaveGeneration = 0

  const persistDraftNow = (form: BlogDraftInput): boolean => {
    if (!readyForAutosave.value) return false

    draft.value = {
      ...createEmptyBlogDraft(),
      ...draft.value,
      title: form.title,
      content: form.content,
      excerpt: form.excerpt,
      coverImage: form.coverImage,
      category: form.category,
      tags: form.tags,
      status: form.status,
      savedAt: new Date().toISOString(),
    }
    options.onPersist?.()
    return true
  }

  const debouncedPersistDraft = useDebounceFn(
    (form: BlogDraftInput, generation: number) => {
      if (generation !== autosaveGeneration) return false
      return persistDraftNow(form)
    },
    options.debounceMs ?? 5000,
  )

  const persistDraft = (form: BlogDraftInput) => {
    debouncedPersistDraft(form, autosaveGeneration)
  }

  const clearDraft = () => {
    autosaveGeneration += 1
    draft.value = createEmptyBlogDraft()
  }

  const restoreDraft = (shouldRestore: boolean): BlogDraftInput | null => {
    if (!hasDraft.value) return null
    if (!shouldRestore) {
      clearDraft()
      return null
    }
    const { savedAt: _savedAt, ...restoredDraft } = draft.value
    return restoredDraft
  }

  const enableAutosave = () => {
    readyForAutosave.value = true
  }

  const disableAutosave = () => {
    autosaveGeneration += 1
    readyForAutosave.value = false
  }

  return {
    draft,
    hasDraft,
    readyForAutosave,
    persistDraft,
    persistDraftNow,
    restoreDraft,
    clearDraft,
    enableAutosave,
    disableAutosave,
  }
}
