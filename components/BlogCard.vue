<template>
  <article
    class="blog-card group flex h-full flex-col"
    @mouseenter="prefetchDetail"
  >
    <div v-if="isAdmin" class="absolute right-3 top-3 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <NuxtLink
        :to="`/admin/blog/${post.id}/edit`"
        class="admin-btn h-9 w-9 flex items-center justify-center rounded-xl bg-white/90 shadow-sm backdrop-blur-sm dark:bg-slate-900/90"
        title="編輯"
      >
        <Icon name="heroicons:pencil" class="h-4 w-4 text-sky-600 dark:text-sky-400" />
      </NuxtLink>
      <button
        class="admin-btn h-9 w-9 flex items-center justify-center rounded-xl bg-white/90 shadow-sm backdrop-blur-sm dark:bg-slate-900/90"
        title="刪除"
        @click="handleDelete"
      >
        <Icon name="heroicons:trash" class="h-4 w-4 text-red-600 dark:text-red-400" />
      </button>
    </div>

    <NuxtLink :to="`/articles/${post.slug}`" class="relative block aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
      <NuxtImg
        v-if="post.coverImage"
        :src="post.coverImage"
        :alt="post.title"
        width="600"
        height="375"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) group-hover:scale-110"
      />
      <div v-else class="flex h-full w-full items-center justify-center">
        <Icon name="heroicons:photo" class="h-12 w-12 text-slate-300 dark:text-slate-700" />
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div class="absolute left-4 top-4">
        <span
          class="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md"
        >
          {{ $t(`blog.categories.${categoryKey}`) || post.category }}
        </span>
      </div>
    </NuxtLink>

    <div class="flex flex-1 flex-col pt-5">
      <div class="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        <Icon name="heroicons:calendar" class="h-3 w-3" />
        {{ publishedAtLabel }}
        <template v-if="readingTime">
          <span class="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <Icon name="heroicons:clock" class="h-3 w-3" />
          {{ readingTime }} {{ $t('blog.minute') }}
        </template>
      </div>

      <h3 class="mb-3 text-xl font-bold leading-tight text-slate-950 transition-colors group-hover:text-sky-600 dark:text-white dark:group-hover:text-sky-400">
        <NuxtLink :to="`/articles/${post.slug}`" class="line-clamp-2 focus:outline-none">
          {{ post.title }}
        </NuxtLink>
      </h3>

      <p v-if="post.excerpt" class="mb-6 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {{ post.excerpt }}
      </p>

      <div class="flex items-center justify-between mt-auto">
        <div class="flex items-center gap-2.5">
          <div class="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center dark:bg-slate-800">
            <Icon name="heroicons:user" class="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </div>
          <span class="text-xs font-bold text-slate-700 dark:text-slate-300">
            {{ authorLabel }}
          </span>
        </div>

        <NuxtLink
          :to="`/articles/${post.slug}`"
          class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 transition-all hover:bg-slate-950 hover:text-white dark:border-slate-800 dark:hover:bg-white dark:hover:text-slate-950"
        >
          <Icon name="heroicons:arrow-up-right" class="h-5 w-5" />
        </NuxtLink>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { refreshNuxtData, useAuth, useI18n, useToast } from '#imports'
import { calculateReadingTime } from '~/lib/blog'
import { normalizeCategory } from '~/types/blog'

interface Author {
  id: number | string
  name: string | null
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
const { t, locale } = useI18n()
const toast = useToast()

const readingTime = computed(() =>
  props.post.content ? calculateReadingTime(props.post.content) : null
)
const hasPrefetched = ref(false)

const authorLabel = computed(() => {
  const name = props.post.author?.name?.trim()
  return name || t('blog.author')
})

const publishedAtLabel = computed(() => {
  if (!props.post.publishedAt) return ''
  return new Intl.DateTimeFormat(locale.value === 'zh-TW' ? 'zh-TW' : 'en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(props.post.publishedAt))
})

const handleDelete = async () => {
  if (!confirm(t('blog.confirmDelete', { title: props.post.title }))) return

  try {
    const response = await fetch(`/api/blog/${props.post.id}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Delete failed')
    toast.success(t('blog.deleteSuccess'))
    refreshNuxtData()
  } catch (error: any) {
    console.error('Failed to delete post:', error)
    toast.error(error.data?.statusMessage || t('blog.deleteFailed'))
  }
}

const categoryKey = computed(() => normalizeCategory(props.post.category))

const prefetchDetail = async () => {
  if (hasPrefetched.value || !props.post.slug) return
  hasPrefetched.value = true
  try {
    await fetch(`/api/blog/${props.post.slug}`)
  } catch (prefetchError) {
    console.warn('Prefetch blog detail failed:', prefetchError)
  }
}
</script>

<style scoped>
.blog-card {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.cubic-bezier {
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
