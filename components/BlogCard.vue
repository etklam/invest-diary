<template>
  <article
    class="bg-white dark:bg-gray-900/50 dark:border dark:border-gray-700/50 dark:backdrop-blur-sm rounded-lg shadow-md overflow-hidden hover:shadow-xl dark:hover:shadow-indigo-500/10 dark:hover:border-indigo-500/30 transition-all duration-300 flex flex-col h-full relative"
  >
    <!-- Admin Actions -->
    <div v-if="isAdmin" class="absolute top-2 right-2 z-10 flex gap-2">
      <NuxtLink
        :to="`/admin/blog/${post.id}/edit`"
        class="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-md shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
        title="編輯"
      >
        <i-heroicons-pencil class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      </NuxtLink>
      <button
        @click="handleDelete"
        class="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-md shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
        title="刪除"
      >
        <i-heroicons-trash class="h-4 w-4 text-red-600 dark:text-red-400" />
      </button>
    </div>

    <!-- Cover Image -->
    <div v-if="post.coverImage" class="aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
      <NuxtImg
        :src="post.coverImage"
        :alt="post.title"
        width="800"
        height="450"
        format="webp"
        loading="lazy"
        class="w-full h-full object-cover"
      />
    </div>

    <div class="p-6 flex-1 flex flex-col">
      <!-- Category Badge -->
      <div class="mb-3">
        <span
          class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30"
        >
          {{ $t(`blog.categories.${categoryKey}`) || post.category }}
        </span>
      </div>

      <!-- Title -->
      <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
        <NuxtLink :to="`/blog/${post.slug}`" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          {{ post.title }}
        </NuxtLink>
      </h3>

      <!-- Excerpt -->
      <p v-if="post.excerpt" class="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 flex-1 leading-relaxed">
        {{ post.excerpt }}
      </p>

      <!-- Tags -->
      <div v-if="parsedTags.length > 0" class="flex flex-wrap gap-2 mb-4">
        <span
          v-for="tag in parsedTags.slice(0, 3)"
          :key="tag"
          class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700 dark:bg-gray-800/80 dark:text-gray-300 dark:border dark:border-gray-700/50"
        >
          #{{ tag }}
        </span>
      </div>

      <!-- Meta Info -->
      <PostMeta
        v-if="post.author"
        :author="post.author.name || post.author.email"
        :date="post.publishedAt!"
        :reading-time="readingTime ?? 0"
      />

      <!-- Read More Link -->
      <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
        <NuxtLink
          :to="`/blog/${post.slug}`"
          class="inline-flex items-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
        >
          {{ $t('blog.readMore') }}
          <i-heroicons-arrow-right class="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
        </NuxtLink>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { calculateReadingTime, parseTags } from '~/lib/blog'
import { normalizeCategory } from '~/types/blog'

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
  // ✅ list / meta view 不再強制依賴 author / content
  author?: Author
  content?: string
}

const props = defineProps<{
  post: Post
}>()

const { isAdmin } = useAuth()
const toast = useToast()

const parsedTags = computed(() => parseTags(props.post.tags))

// ✅ meta view 無 content 時避免不必要計算
const readingTime = computed(() =>
  props.post.content ? calculateReadingTime(props.post.content) : undefined
)

// Delete post
const handleDelete = async () => {
  if (!confirm(`確定要刪除文章「${props.post.title}」嗎？此操作無法復原。`)) return

  try {
    await $fetch(`/api/blog/${props.post.id}`, { method: 'DELETE' })
    toast.success('文章已刪除')
    // Refresh the page to update the list
    refreshNuxtData()
  } catch (error: any) {
    console.error('Failed to delete post:', error)
    toast.error(error.data?.statusMessage || '刪除失敗')
  }
}

// Normalize category to translation key (handles legacy Chinese values)
const categoryKey = computed(() => normalizeCategory(props.post.category))
</script>
