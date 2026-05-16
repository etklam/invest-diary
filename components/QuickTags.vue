<template>
  <div class="space-y-3">
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">自定義標籤</label>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          v-model="customInput"
          type="text"
          class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          placeholder="用 @ 分隔，例如：工作@靈感"
          @keydown.enter.prevent="addFromInput"
          @blur="addFromInput"
          aria-label="自定義標籤輸入"
        />
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition-colors duration-200 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200"
          @click="addFromInput"
        >
          新增
        </button>
      </div>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">使用 @ 分隔多個標籤</p>
    </div>

    <div v-if="selectedTags.length" class="flex flex-wrap gap-2">
      <span
        v-for="tag in selectedTags"
        :key="tag"
        class="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
      >
        #{{ displayTag(tag) }}
        <button
          type="button"
          class="text-indigo-500 hover:text-indigo-700 dark:text-indigo-200"
          :aria-label="`移除標籤 ${tag}`"
          @click="removeSelected(tag)"
        >
          <Icon name="heroicons:x-mark" class="h-3 w-3" />
        </button>
      </span>
    </div>

    <div v-if="recentTags.length" class="space-y-2">
      <p class="text-xs font-medium text-gray-500 dark:text-gray-400">最近使用</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tag in recentTags"
          :key="tag"
          type="button"
          class="px-3 py-1 rounded-full text-xs border border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          @click="addSelected(tag)"
        >
          #{{ tag }}
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <p class="text-xs font-medium text-gray-500 dark:text-gray-400">快速標籤</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tag in tags"
          :key="tag.key"
          type="button"
          class="px-3 py-1 rounded-full text-xs border transition-colors duration-200"
          :class="selected.has(tag.key)
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'"
          @click="toggle(tag.key)"
        >
          #{{ t(tag.labelKey) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { DEFAULT_TAGS, type TagKey } from '~/types/diary'

// --- Tag history (inlined from deleted useQuickNoteTags) ---
const TAGS_KEY = 'quick-note-tags'
const MAX_HISTORY = 30

const tagHistory = useLocalStorage<string[]>(TAGS_KEY, [])

function getRecentTags(limit = 8) {
  return tagHistory.value.slice(0, limit)
}

function addTagToHistory(tag: string) {
  const cleaned = tag.trim()
  if (!cleaned) return
  const next = [cleaned, ...tagHistory.value.filter(t => t !== cleaned)]
  tagHistory.value = next.slice(0, MAX_HISTORY)
}

// --- Component logic ---
const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const { t } = useI18n()

const tags = DEFAULT_TAGS

const selected = computed(() => new Set(props.modelValue))
const selectedTags = computed(() => props.modelValue)

const customInput = ref('')

const recentTags = computed(() => getRecentTags())

const displayTag = (tag: string) => {
  const matched = tags.find(item => item.key === tag)
  return matched ? t(matched.labelKey) : tag
}

function toggle(key: TagKey) {
  const next = new Set(props.modelValue)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
    addTagToHistory(key)
  }
  emit('update:modelValue', Array.from(next))
}

function addSelected(tag: string) {
  const cleaned = tag.trim()
  if (!cleaned) return
  if (selected.value.has(cleaned)) return
  emit('update:modelValue', [...props.modelValue, cleaned])
  addTagToHistory(cleaned)
}

function removeSelected(tag: string) {
  emit('update:modelValue', props.modelValue.filter(t => t !== tag))
}

function addFromInput() {
  if (!customInput.value.trim()) return
  const parts = customInput.value
    .split('@')
    .map(p => p.trim())
    .filter(Boolean)
  if (!parts.length) return

  const next = new Set(props.modelValue)
  parts.forEach(tag => {
    next.add(tag)
    addTagToHistory(tag)
  })
  emit('update:modelValue', Array.from(next))
  customInput.value = ''
}
</script>
