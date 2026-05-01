<template>
  <div class="space-y-6">
    <div>
      <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.title') }} <span class="text-red-500">*</span>
      </label>
      <div class="mt-1">
        <input
          id="title"
          v-model="localTitle"
          type="text"
          name="title"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          :placeholder="$t('blog.titlePlaceholder')"
        />
      </div>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ $t('blog.slug') }}: {{ slugPreview }}
      </p>
    </div>

    <BlogEditorMarkdownPreview v-model:content="localContent" />

    <BlogEditorMetadataForm
      v-model:excerpt="localExcerpt"
      v-model:cover-image="localCoverImage"
      v-model:category="localCategory"
      v-model:tags="localTags"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BlogEditorMarkdownPreview from '~/components/blog/BlogEditorMarkdownPreview.vue'
import BlogEditorMetadataForm from '~/components/blog/BlogEditorMetadataForm.vue'
import { generateSlug } from '~/lib/blog'

const props = defineProps<{
  title: string
  content: string
  excerpt?: string | null
  coverImage?: string | null
  category: string
  tags?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'update:content', value: string): void
  (e: 'update:excerpt', value: string): void
  (e: 'update:coverImage', value: string): void
  (e: 'update:category', value: string): void
  (e: 'update:tags', value: string): void
}>()

const localTitle = computed({
  get: () => props.title,
  set: (value) => emit('update:title', value)
})

const localContent = computed({
  get: () => props.content,
  set: (value) => emit('update:content', value)
})

const localExcerpt = computed({
  get: () => props.excerpt || '',
  set: (value) => emit('update:excerpt', value)
})

const localCoverImage = computed({
  get: () => props.coverImage || '',
  set: (value) => emit('update:coverImage', value)
})

const localCategory = computed({
  get: () => props.category,
  set: (value) => emit('update:category', value)
})

const localTags = computed({
  get: () => props.tags || '',
  set: (value) => emit('update:tags', value)
})

const slugPreview = computed(() => localTitle.value ? generateSlug(localTitle.value) : '')
</script>
