<template>
  <div class="space-y-6">
    <div>
      <label for="excerpt" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.excerpt') }}
      </label>
      <div class="mt-1">
        <textarea
          id="excerpt"
          v-model="localExcerpt"
          name="excerpt"
          rows="3"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          :placeholder="$t('blog.excerptPlaceholder')"
        />
      </div>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ $t('blog.excerptOptional') }}
      </p>
    </div>

    <div>
      <label for="coverImage" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.coverImage') }}
      </label>
      <div class="mt-1">
        <input
          id="coverImage"
          v-model="localCoverImage"
          type="url"
          name="coverImage"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          :placeholder="$t('blog.coverImagePlaceholder')"
        />
      </div>
    </div>

    <div>
      <label for="category" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.category') }} <span class="text-red-500">*</span>
      </label>
      <div class="mt-1">
        <select
          id="category"
          v-model="localCategory"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">{{ $t('blog.selectCategory') }}</option>
          <option v-for="cat in CATEGORY_OPTIONS" :key="cat" :value="cat">
            {{ $t(`blog.categories.${cat}`) }}
          </option>
        </select>
      </div>
    </div>

    <div>
      <label for="tags" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.tags') }}
      </label>
      <div class="mt-1">
        <input
          id="tags"
          v-model="localTags"
          type="text"
          name="tags"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          :placeholder="$t('blog.tagsPlaceholder')"
        />
      </div>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ $t('blog.tagsHint') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CATEGORY_OPTIONS } from '~/types/blog'

const props = defineProps<{
  excerpt?: string | null
  coverImage?: string | null
  category: string
  tags?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:excerpt', value: string): void
  (e: 'update:coverImage', value: string): void
  (e: 'update:category', value: string): void
  (e: 'update:tags', value: string): void
}>()

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
</script>
