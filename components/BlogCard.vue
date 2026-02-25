<template>
  <article
    class="blog-card group relative flex h-full flex-col overflow-hidden rounded-2xl border p-0 transition-all duration-200"
  >
    <div v-if="isAdmin" class="absolute right-3 top-3 z-20 flex gap-2">
      <NuxtLink
        :to="`/admin/blog/${post.id}/edit`"
        class="admin-btn cursor-pointer rounded-md p-2"
        title="編輯"
      >
        <Icon name="heroicons:pencil-20-solid" class="h-4 w-4 text-sky-700 dark:text-sky-300" />
      </NuxtLink>
      <button
        class="admin-btn cursor-pointer rounded-md p-2"
        title="刪除"
        @click="handleDelete"
      >
        <Icon name="heroicons:trash-20-solid" class="h-4 w-4 text-red-600 dark:text-red-400" />
      </button>
    </div>

    <div v-if="post.coverImage" class="aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
      <NuxtImg
        :src="post.coverImage"
        :alt="post.title"
        width="800"
        height="450"
        format="webp"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
      />
    </div>

    <div class="flex flex-1 flex-col p-6">
      <div class="mb-3">
        <span
          class="inline-flex items-center rounded-full border border-amber-300/60 bg-amber-100/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-300"
        >
          {{ $t(`blog.categories.${categoryKey}`) || post.category }}
        </span>
      </div>

      <h3 class="mb-2 line-clamp-2 text-xl font-semibold text-slate-950 dark:text-slate-100">
        <NuxtLink :to="`/blog/${post.slug}`" class="cursor-pointer transition-colors duration-200 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:hover:text-sky-300">
          {{ post.title }}
        </NuxtLink>
      </h3>

      <p v-if="post.excerpt" class="mb-4 line-clamp-3 flex-1 leading-relaxed text-slate-700 dark:text-slate-300">
        {{ post.excerpt }}
      </p>

      <div v-if="parsedTags.length > 0" class="mb-4 flex flex-wrap gap-2">
        <span
          v-for="tag in parsedTags.slice(0, 3)"
          :key="tag"
          class="inline-flex items-center rounded-md border border-sky-200/70 bg-sky-50/60 px-2 py-1 text-xs text-sky-700 dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-300"
        >
          #{{ tag }}
        </span>
      </div>

      <PostMeta
        v-if="post.author"
        :author="post.author.name || post.author.email"
        :date="post.publishedAt!"
        :reading-time="readingTime ?? 0"
      />

      <div class="mt-4 border-t border-slate-200/70 pt-4 dark:border-slate-700/60">
        <NuxtLink
          :to="`/blog/${post.slug}`"
          class="inline-flex cursor-pointer items-center font-semibold text-sky-700 transition-colors duration-200 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
        >
          {{ $t('blog.readMore') }}
          <Icon name="heroicons:arrow-right-20-solid" class="ml-2 h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-1" />
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
  author?: Author
  content?: string
}

const props = defineProps<{
  post: Post
}>()

const { isAdmin } = useAuth()
const toast = useToast()

const parsedTags = computed(() => parseTags(props.post.tags))
const readingTime = computed(() =>
  props.post.content ? calculateReadingTime(props.post.content) : undefined
)

const handleDelete = async () => {
  if (!confirm(`確定要刪除文章「${props.post.title}」嗎？此操作無法復原。`)) return

  try {
    await $fetch(`/api/blog/${props.post.id}`, { method: 'DELETE' })
    toast.success('文章已刪除')
    refreshNuxtData()
  } catch (error: any) {
    console.error('Failed to delete post:', error)
    toast.error(error.data?.statusMessage || '刪除失敗')
  }
}

const categoryKey = computed(() => normalizeCategory(props.post.category))
</script>

<style scoped>
.blog-card {
  border-color: rgb(186 230 253 / 82%);
  background: rgb(255 255 255 / 84%);
  backdrop-filter: blur(8px);
}

.blog-card:hover {
  transform: translateY(-3px);
  border-color: rgb(14 165 233 / 45%);
  box-shadow: 0 14px 30px rgb(14 165 233 / 14%);
}

:global(.dark .blog-card),
:global(.dark-mode .blog-card) {
  border-color: rgb(71 85 105);
  background: rgb(10 16 30 / 88%);
}

:global(.dark .blog-card:hover),
:global(.dark-mode .blog-card:hover) {
  border-color: rgb(56 189 248 / 70%);
  box-shadow: 0 14px 30px rgb(2 6 23 / 45%);
}

.admin-btn {
  border: 1px solid rgb(186 230 253 / 70%);
  background: rgb(255 255 255 / 82%);
  backdrop-filter: blur(6px);
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.admin-btn:hover {
  border-color: rgb(125 211 252 / 80%);
  background: rgb(240 249 255 / 95%);
}

:global(.dark .admin-btn),
:global(.dark-mode .admin-btn) {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42 / 88%);
}

:global(.dark .admin-btn:hover),
:global(.dark-mode .admin-btn:hover) {
  border-color: rgb(56 189 248 / 70%);
  background: rgb(30 41 59);
}
</style>
