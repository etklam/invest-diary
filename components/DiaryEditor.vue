<template>
  <div class="space-y-6">
    <div>
      <label for="title" class="block text-sm font-medium text-dt-text-muted">標題</label>
      <div class="mt-1">
        <input
          type="text"
          name="title"
          id="title"
          v-model="localTitle"
          class="shadow-sm focus:ring-dt-primary/30 focus:border-dt-primary block w-full sm:text-sm border-dt-border rounded-md bg-dt-surface-strong"
          placeholder="輸入日記標題"
        />
      </div>
    </div>

    <div>
      <label for="content" class="block text-sm font-medium text-dt-text-muted">內容 (Markdown)</label>
      <div class="mt-1">
        <textarea
          id="content"
          name="content"
          rows="15"
          v-model="localContent"
          class="shadow-sm focus:ring-dt-primary/30 focus:border-dt-primary block w-full sm:text-sm border-dt-border rounded-md bg-dt-surface-strong font-mono"
          placeholder="# 今日市場觀察..."
        ></textarea>
      </div>
      <p class="mt-2 text-sm text-dt-text-soft">
        支援 Markdown 語法。
      </p>
    </div>

    <div class="bg-dt-surface-strong p-4 rounded-md border border-dt-border">
      <h3 class="text-lg font-medium text-dt-text mb-4">預覽</h3>
      <div class="prose dark:prose-invert max-w-none bg-dt-surface p-4 rounded-md border border-dt-border min-h-[200px]">
        <MDC :value="localContent" v-if="localContent" />
        <p v-else class="text-dt-text-soft italic">預覽將顯示於此...</p>
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
