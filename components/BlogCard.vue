<template>
  <article
    class="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition-colors duration-300 hover:border-zinc-300 dark:border-zinc-700/70 dark:bg-zinc-900/70 dark:hover:border-zinc-600"
  >
    <!-- Admin Actions -->
    <div v-if="isAdmin" class="absolute right-2 top-2 z-10 flex gap-2">
      <NuxtLink
        :to="`/admin/blog/${post.id}/edit`"
        class="cursor-pointer rounded-md border border-zinc-200 bg-white/90 p-2 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/90 dark:hover:bg-zinc-700"
        title="編輯"
      >
        <i-heroicons-pencil class="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </NuxtLink>
      <button
        @click="handleDelete"
        class="cursor-pointer rounded-md border border-zinc-200 bg-white/90 p-2 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/90 dark:hover:bg-zinc-700"
        title="刪除"
      >
        <i-heroicons-trash class="h-4 w-4 text-red-600 dark:text-red-400" />
      </button>
    </div>

    <!-- Cover Image -->
    <div v-if="post.coverImage" class="aspect-video overflow-hidden bg-zinc-100 dark:bg-zinc-800">
      <NuxtImg
        :src="post.coverImage"
        :alt="post.title"
        width="800"
        height="450"
        format="webp"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
      />
    </div>

    <div class="flex flex-1 flex-col p-6">
      <!-- Category Badge -->
      <div class="mb-3">
        <span
          class="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300"
        >
          {{ $t(`blog.categories.${categoryKey}`) || post.category }}
        </span>
      </div>

      <!-- Title -->
      <h3 class="mb-2 line-clamp-2 font-serif text-xl font-semibold text-zinc-950 dark:text-zinc-100">
        <NuxtLink :to="`/blog/${post.slug}`" class="cursor-pointer transition-colors duration-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:text-blue-400">
          {{ post.title }}
        </NuxtLink>
      </h3>

      <!-- Excerpt -->
      <p v-if="post.excerpt" class="mb-4 line-clamp-3 flex-1 leading-relaxed text-zinc-700 dark:text-zinc-300">
        {{ post.excerpt }}
      </p>

      <!-- Tags -->
      <div v-if="parsedTags.length > 0" class="flex flex-wrap gap-2 mb-4">
        <span
          v-for="tag in parsedTags.slice(0, 3)"
          :key="tag"
          class="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700/70 dark:bg-zinc-800/80 dark:text-zinc-300"
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
      <div class="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700/50">
        <NuxtLink
          :to="`/blog/${post.slug}`"
          class="inline-flex cursor-pointer items-center font-medium text-blue-700 transition-colors duration-200 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {{ $t('blog.readMore') }}
          <i-heroicons-arrow-right class="ml-2 h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-1" />
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
