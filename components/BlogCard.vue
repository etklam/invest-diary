<template>
  <article
    class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col h-full"
  >
    <!-- Cover Image -->
    <div v-if="post.coverImage" class="aspect-video overflow-hidden">
      <img
        :src="post.coverImage"
        :alt="post.title"
        class="w-full h-full object-cover"
      />
    </div>

    <div class="p-6 flex-1 flex flex-col">
      <!-- Category Badge -->
      <div class="mb-3">
        <span
          class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
        >
          {{ $t(`blog.categories.${categoryKey}`) || post.category }}
        </span>
      </div>

      <!-- Title -->
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
        <NuxtLink :to="`/blog/${post.slug}`" class="hover:text-indigo-600 dark:hover:text-indigo-400">
          {{ post.title }}
        </NuxtLink>
      </h3>

      <!-- Excerpt -->
      <p v-if="post.excerpt" class="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 flex-1">
        {{ post.excerpt }}
      </p>

      <!-- Tags -->
      <div v-if="parsedTags.length > 0" class="flex flex-wrap gap-2 mb-4">
        <span
          v-for="tag in parsedTags.slice(0, 3)"
          :key="tag"
          class="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
        >
          #{{ tag }}
        </span>
      </div>

      <!-- Meta Info -->
      <PostMeta
        :author="post.author.name || post.author.email"
        :date="post.publishedAt!"
        :reading-time="readingTime"
      />

      <!-- Read More Link -->
      <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <NuxtLink
          :to="`/blog/${post.slug}`"
          class="inline-flex items-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
        >
          {{ $t('blog.readMore') }}
          <i-heroicons-arrow-right class="ml-2 w-4 h-4" />
        </NuxtLink>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { calculateReadingTime, parseTags } from '~/lib/blog'

interface Author {
  id: number | string
  name: string | null
  email: string
}

interface Post {
  id: number | string
  title: string
  slug: string
  excerpt?: string | null
  coverImage?: string | null
  category: string
  tags?: string | null
  publishedAt: Date | string
  author: Author
  content: string
}

const props = defineProps<{
  post: Post
}>()

const parsedTags = computed(() => parseTags(props.post.tags))
const readingTime = computed(() => calculateReadingTime(props.post.content))

// Map category to translation key
const categoryKey = computed(() => {
  const categoryMap: Record<string, string> = {
    '基本面分析': 'fundamental',
    '技术面分析': 'technical',
    '市场观察': 'market',
    '投資策略': 'strategy',
    '投资策略': 'strategy',
    'Fundamental Analysis': 'fundamental',
    'Technical Analysis': 'technical',
    'Market Watch': 'market',
    'Investment Strategy': 'strategy',
  }
  return categoryMap[props.post.category] || props.post.category
})
</script>
