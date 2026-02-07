<template>
  <div class="space-y-6">
    <div>
      <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">標題</label>
      <div class="mt-1">
        <input
          type="text"
          name="title"
          id="title"
          v-model="localTitle"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="輸入日記標題"
        />
      </div>
    </div>

    <div>
      <label for="content" class="block text-sm font-medium text-gray-700 dark:text-gray-300">內容 (Markdown)</label>
      <div class="mt-1">
        <textarea
          id="content"
          name="content"
          rows="15"
          v-model="localContent"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
          placeholder="# 今日市場觀察..."
        ></textarea>
      </div>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        支援 Markdown 語法。
      </p>
    </div>

    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">預覽</h3>
      <div class="prose dark:prose-invert max-w-none bg-white dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700 min-h-[200px]">
        <MDC :value="localContent" v-if="localContent" />
        <p v-else class="text-gray-400 italic">預覽將顯示於此...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  content: string
}>()

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'update:content', value: string): void
}>()

const localTitle = computed({
  get: () => props.title,
  set: (value) => emit('update:title', value)
})

const localContent = computed({
  get: () => props.content,
  set: (value) => emit('update:content', value)
})
</script>
