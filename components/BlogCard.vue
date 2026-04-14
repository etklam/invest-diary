<template>
  <article
    class="group flex h-full flex-col border border-line bg-surface-alt transition-all duration-fast hover:border-line-hover"
    @mouseenter="prefetchDetail"
  >
    <!-- Admin Actions -->
    <div v-if="isAdmin" class="absolute right-3 top-3 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <NuxtLink
        :to="`/admin/blog/${post.id}/edit`"
        class="h-8 w-8 flex items-center justify-center bg-surface border border-line text-copy-muted hover:text-accent transition-colors"
        title="編輯"
      >
        <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
      </NuxtLink>
      <button
        class="h-8 w-8 flex items-center justify-center bg-surface border border-line text-copy-muted hover:text-semantic-error transition-colors"
        title="刪除"
        @click="handleDelete"
      >
        <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- Cover Image -->
    <NuxtLink :to="`/articles/${post.slug}`" class="relative block aspect-[16/10] overflow-hidden bg-surface-alt">
      <NuxtImg
        v-if="post.coverImage"
        :src="post.coverImage"
        :alt="post.title"
        width="600"
        height="375"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-standard group-hover:scale-105"
      />
      <div v-else class="flex h-full w-full items-center justify-center">
        <Icon name="lucide:image" class="h-10 w-10 text-copy-muted opacity-30" />
      </div>

      <div class="absolute left-3 top-3">
        <BaseBadge variant="info">
          {{ $t(`blog.categories.${categoryKey}`) || post.category }}
        </BaseBadge>
      </div>
    </NuxtLink>

    <!-- Content -->
    <div class="flex flex-1 flex-col p-5">
      <!-- Meta -->
      <div class="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-copy-muted">
        <Icon name="lucide:calendar" class="h-3 w-3" />
        {{ publishedAtLabel }}
        <template v-if="readingTime">
          <span class="w-px h-3 bg-line" />
          <Icon name="lucide:clock" class="h-3 w-3" />
          {{ readingTime }} {{ $t('blog.minute') }}
        </template>
      </div>

      <!-- Title -->
      <h3 class="mb-3 text-lg font-semibold leading-tight text-copy transition-colors group-hover:text-accent">
        <NuxtLink :to="`/articles/${post.slug}`" class="line-clamp-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {{ post.title }}
        </NuxtLink>
      </h3>

      <!-- Excerpt -->
      <p v-if="post.excerpt" class="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-copy-secondary">
        {{ post.excerpt }}
      </p>

      <!-- Footer -->
      <div class="flex items-center justify-between mt-auto pt-4 border-t border-line">
        <div class="flex items-center gap-2">
          <div class="h-7 w-7 bg-surface-alt border border-line flex items-center justify-center rounded-md">
            <Icon name="lucide:user" class="h-3.5 w-3.5 text-copy-muted" />
          </div>
          <span class="text-xs font-medium text-copy-secondary">
            {{ authorLabel }}
          </span>
        </div>

        <NuxtLink
          :to="`/articles/${post.slug}`"
          class="flex items-center gap-1.5 text-xs font-semibold text-copy-muted hover:text-accent transition-colors"
        >
          閱讀
          <Icon name="lucide:arrow-right" class="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
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
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
