import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

const TAGS_KEY = 'quick-note-tags'
const MAX_HISTORY = 30

export function useQuickNoteTags() {
  const history = useLocalStorage<string[]>(TAGS_KEY, [])

  const getRecentTags = (limit = 8) => {
    return history.value.slice(0, limit)
  }

  const addTag = (tag: string) => {
    const cleaned = tag.trim()
    if (!cleaned) return
    const next = [cleaned, ...history.value.filter(t => t !== cleaned)]
    history.value = next.slice(0, MAX_HISTORY)
  }

  const removeTag = (tag: string) => {
    history.value = history.value.filter(t => t !== tag)
  }

  const recentTags = computed(() => history.value)

  return {
    history: recentTags,
    getRecentTags,
    addTag,
    removeTag
  }
}
