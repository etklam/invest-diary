<template>
  <div class="space-y-6">
    <!-- Title Input -->
    <div>
      <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.title') }} <span class="text-red-500">*</span>
      </label>
      <div class="mt-1">
        <input
          type="text"
          name="title"
          id="title"
          v-model="localTitle"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          :placeholder="$t('blog.titlePlaceholder')"
        />
      </div>
      <!-- Slug Preview -->
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ $t('blog.slug') }}: {{ slugPreview }}
      </p>
    </div>

    <!-- Content Input -->
    <div>
      <label for="content" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.content') }} <span class="text-red-500">*</span>
      </label>
      <div class="mt-1">
        <textarea
          id="content"
          name="content"
          rows="15"
          v-model="localContent"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
          :placeholder="$t('blog.contentPlaceholder')"
        ></textarea>
      </div>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {{ $t('blog.markdownSupported') }}
      </p>
    </div>

    <!-- Excerpt Input -->
    <div>
      <label for="excerpt" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.excerpt') }}
      </label>
      <div class="mt-1">
        <textarea
          id="excerpt"
          name="excerpt"
          rows="3"
          v-model="localExcerpt"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          :placeholder="$t('blog.excerptPlaceholder')"
        ></textarea>
      </div>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ $t('blog.excerptOptional') }}
      </p>
    </div>

    <!-- Cover Image URL -->
    <div>
      <label for="coverImage" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.coverImage') }}
      </label>
      <div class="mt-1">
        <input
          type="url"
          name="coverImage"
          id="coverImage"
          v-model="localCoverImage"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          :placeholder="$t('blog.coverImagePlaceholder')"
        />
      </div>
    </div>

    <!-- Category Selection -->
    <div>
      <label for="category" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.category') }} <span class="text-red-500">*</span>
      </label>
      <div class="mt-1">
        <select
          id="category"
          v-model="localCategory"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="">{{ $t('blog.selectCategory') }}</option>
          <option v-for="cat in CATEGORY_OPTIONS" :key="cat" :value="cat">
            {{ $t(`blog.categories.${cat}`) }}
          </option>
        </select>
      </div>
    </div>

    <!-- Tags Input -->
    <div>
      <label for="tags" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.tags') }}
      </label>
      <div class="mt-1">
        <input
          type="text"
          name="tags"
          id="tags"
          v-model="localTags"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          :placeholder="$t('blog.tagsPlaceholder')"
        />
      </div>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ $t('blog.tagsHint') }}
      </p>
    </div>

    <!-- Preview -->
    <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {{ $t('blog.preview') }}
      </h3>
      <div class="prose dark:prose-invert max-w-none bg-white dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700 min-h-[200px]">
        <MDC :value="localContent" v-if="localContent" />
        <p v-else class="text-gray-400 italic">{{ $t('blog.previewPlaceholder') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { generateSlug } from '~/lib/blog'
import { CATEGORY_OPTIONS } from '~/types/blog'

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

const slugPreview = computed(() => {
  return localTitle.value ? generateSlug(localTitle.value) : ''
})
</script>
