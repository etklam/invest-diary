<template>
  <div class="space-y-6">
    <!-- Title Field -->
    <div>
      <label for="title" class="block text-sm font-medium text-copy-secondary mb-1.5">
        標題
      </label>
      <input
        type="text"
        name="title"
        id="title"
        v-model="localTitle"
        class="w-full px-3 py-2.5 text-sm border border-solid border-line bg-surface text-copy transition-all duration-fast ease-in-out focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        placeholder="輸入日記標題"
      />
    </div>

    <!-- Content Field -->
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <label for="content" class="block text-sm font-medium text-copy-secondary">
          內容 (Markdown)
        </label>
        <button
          type="button"
          class="text-xs font-semibold uppercase tracking-widest text-copy-muted hover:text-accent transition-colors duration-fast"
          @click="showPreview = !showPreview"
        >
          {{ showPreview ? '隱藏預覽' : '顯示預覽' }}
        </button>
      </div>
      <textarea
        id="content"
        name="content"
        rows="15"
        v-model="localContent"
        class="w-full px-3 py-2.5 text-sm border border-solid border-line bg-surface text-copy font-mono transition-all duration-fast ease-in-out focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 resize-y"
        placeholder="# 今日市場觀察..."
      />
      <p class="mt-1.5 text-xs text-copy-muted">支援 Markdown 語法。</p>
    </div>

    <!-- Preview -->
    <div v-if="showPreview" class="bg-surface-alt border border-line p-6">
      <h3 class="text-xs font-semibold uppercase tracking-widest text-copy-muted mb-4">預覽</h3>
      <div class="prose prose-sm dark:prose-invert max-w-none min-h-[200px]
        prose-headings:font-semibold prose-headings:text-copy
        prose-p:text-copy-secondary prose-p:leading-relaxed
        prose-a:text-accent prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-l-2 prose-blockquote:border-accent prose-blockquote:pl-4 prose-blockquote:not-italic
        prose-code:bg-surface prose-code:px-1.5 prose-code:py-0.5 prose-code:text-copy prose-code:before:content-[''] prose-code:after:content-['']
        prose-hr:border-line">
        <MDC :value="localContent" v-if="localContent" />
        <p v-else class="text-copy-muted italic text-sm">預覽將顯示於此...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  title: string
  content: string
}>()

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'update:content', value: string): void
}>()

const showPreview = ref(false)

const localTitle = computed({
  get: () => props.title,
  set: (value) => emit('update:title', value)
})

const localContent = computed({
  get: () => props.content,
  set: (value) => emit('update:content', value)
})
</script>
