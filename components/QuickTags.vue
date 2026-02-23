<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="tag in tags"
      :key="tag.key"
      type="button"
      class="px-3 py-1 rounded-full text-sm border"
      :class="selected.has(tag.key)
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'"
      @click="toggle(tag.key)"
    >
      #{{ t(tag.labelKey) }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DEFAULT_TAGS, type TagKey } from '~/types/diary'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const { t } = useI18n()

const tags = DEFAULT_TAGS

const selected = computed(() => new Set(props.modelValue))

function toggle(key: TagKey) {
  const next = new Set(props.modelValue)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  emit('update:modelValue', Array.from(next))
}
</script>
