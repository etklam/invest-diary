<template>
  <section class="quick-tags space-y-4" aria-labelledby="quick-tags-title">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 id="quick-tags-title" class="text-sm font-semibold" style="color: var(--color-text);">標籤</h3>
        <p class="mt-1 text-xs" style="color: var(--color-text-soft);">按 Enter 新增，也可以輸入 # 標籤</p>
      </div>
      <span v-if="selectedTags.length" class="font-data text-xs" style="color: var(--color-text-soft);">
        {{ selectedTags.length }}
      </span>
    </div>

    <div class="flex gap-2">
      <input
        v-model="customInput"
        type="text"
        class="min-w-0 flex-1 rounded-dt-sm border px-3 py-2.5 text-sm outline-none transition-colors focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20"
        style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
        placeholder="#市場 或 輸入標籤"
        aria-label="標籤輸入"
        @keydown.enter.prevent="addFromInput"
        @blur="addFromInput"
      />
      <button
        type="button"
        class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-dt-sm border px-3 text-sm font-semibold transition-colors hover:border-dt-primary hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
        style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-text-muted);"
        @click="addFromInput"
      >
        新增
      </button>
    </div>

    <div v-if="selectedTags.length" class="space-y-2">
      <p class="text-[11px] font-semibold uppercase tracking-[0.12em]" style="color: var(--color-text-soft);">已選標籤</p>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="tag in selectedTags"
          :key="tag"
          class="inline-flex min-h-8 max-w-full items-center gap-1 rounded-dt-pill border px-2.5 text-xs font-medium"
          style="border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border)); background: color-mix(in srgb, var(--color-primary) 9%, var(--color-surface-muted)); color: var(--color-primary);"
        >
          <span class="truncate">#{{ displayTag(tag) }}</span>
          <button
            type="button"
            class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-dt-primary/10 focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
            :aria-label="`移除標籤 ${tag}`"
            @click="removeSelected(tag)"
          >
            <Icon name="heroicons:x-mark" class="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    </div>

    <div v-if="recentTags.length" class="space-y-2">
      <p class="text-[11px] font-semibold uppercase tracking-[0.12em]" style="color: var(--color-text-soft);">最近使用</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tag in recentTags"
          :key="tag"
          type="button"
          class="min-h-9 max-w-full truncate rounded-dt-pill border px-3 text-xs transition-colors hover:border-dt-primary hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
          :style="selected.has(tag)
            ? 'border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface-muted)); color: var(--color-primary);'
            : 'border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-muted);'"
          :aria-pressed="selected.has(tag)"
          @click="addSelected(tag)"
        >
          #{{ displayTag(tag) }}
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <p class="text-[11px] font-semibold uppercase tracking-[0.12em]" style="color: var(--color-text-soft);">常用標籤</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tag in tags"
          :key="tag.key"
          type="button"
          class="min-h-9 max-w-full truncate rounded-dt-pill border px-3 text-xs transition-colors hover:border-dt-primary hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
          :style="selected.has(tag.key)
            ? 'border-color: var(--color-primary); background: var(--color-primary); color: var(--color-on-ink);'
            : 'border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-muted);'"
          :aria-pressed="selected.has(tag.key)"
          @click="toggle(tag.key)"
        >
          #{{ t(tag.labelKey) }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { DEFAULT_TAGS, type TagKey } from '~/types/diary'

const TAGS_KEY = 'quick-note-tags'
const MAX_HISTORY = 30

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const { t } = useI18n()
const tags = DEFAULT_TAGS
const tagHistory = useLocalStorage<string[]>(TAGS_KEY, [])
const customInput = ref('')

const selected = computed(() => new Set(props.modelValue))
const selectedTags = computed(() => props.modelValue)
const recentTags = computed(() => tagHistory.value.slice(0, 8))

function addTagToHistory(tag: string) {
  const cleaned = tag.trim()
  if (!cleaned) return
  tagHistory.value = [cleaned, ...tagHistory.value.filter(item => item !== cleaned)].slice(0, MAX_HISTORY)
}

function displayTag(tag: string) {
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
  if (!cleaned || selected.value.has(cleaned)) return
  emit('update:modelValue', [...props.modelValue, cleaned])
  addTagToHistory(cleaned)
}

function removeSelected(tag: string) {
  emit('update:modelValue', props.modelValue.filter(item => item !== tag))
}

function addFromInput() {
  const parts = customInput.value
    .split(/[#，,]/)
    .map(item => item.trim())
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
