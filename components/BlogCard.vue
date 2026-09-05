<template>
  <article
    class="blog-card group flex h-full flex-col"
    :data-hydrated="isHydrated"
    @mouseenter="prefetchDetail"
  >
    <div v-if="isAdmin" class="absolute right-3 top-3 z-30 flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
      <NuxtLink
        :to="`/admin/blog/${post.id}/edit`"
        class="admin-btn h-9 w-9 flex items-center justify-center rounded-xl shadow-sm"
        style="background: var(--color-surface)"
        title="編輯"
      >
        <Icon name="heroicons:pencil" class="h-4 w-4" style="color: var(--color-secondary)" />
      </NuxtLink>
      <button
        class="admin-btn h-9 w-9 flex items-center justify-center rounded-xl shadow-sm"
        style="background: var(--color-surface)"
        title="刪除"
        @click="handleDelete"
      >
        <Icon name="heroicons:trash" class="h-4 w-4" style="color: var(--color-danger)" />
      </button>
    </div>

    <NuxtLink :to="`/articles/${post.slug}`" class="relative block aspect-[16/10] overflow-hidden rounded-2xl" style="background: var(--color-surface-strong)">
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
        <Icon name="heroicons:photo" class="h-12 w-12" style="color: var(--color-text-soft)" />
      </div>
      <div class="card-overlay absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div class="absolute left-4 top-4">
        <span
          class="inline-flex items-center rounded-lg bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
        >
          {{ $t(`blog.categories.${categoryKey}`) || post.category }}
        </span>
      </div>
    </NuxtLink>

    <div class="flex flex-1 flex-col pt-5">
      <div class="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style="color: var(--color-text-soft)">
        <Icon name="heroicons:calendar" class="h-3 w-3" />
        {{ publishedAtLabel }}
        <template v-if="readingTime">
          <span class="h-1 w-1 rounded-full" style="background: var(--color-border)" />
          <Icon name="heroicons:clock" class="h-3 w-3" />
          {{ readingTime }} {{ $t('blog.minute') }}
        </template>
      </div>

      <h3 class="card-title mb-3 text-xl font-bold leading-tight transition-colors" style="color: var(--color-text)">
        <NuxtLink :to="`/articles/${post.slug}`" class="line-clamp-2 focus:outline-none" :title="post.title">
          {{ post.title }}
        </NuxtLink>
      </h3>

      <p v-if="post.excerpt" class="mb-6 line-clamp-3 flex-1 text-sm leading-relaxed" style="color: var(--color-text-muted)">
        {{ post.excerpt }}
      </p>

      <div class="flex items-center justify-between mt-auto">
        <div class="flex items-center gap-2.5">
          <div class="h-8 w-8 rounded-full flex items-center justify-center" style="background: var(--color-surface-strong)">
            <Icon name="heroicons:user" class="h-4 w-4" style="color: var(--color-text-soft)" />
          </div>
          <span class="text-xs font-bold" style="color: var(--color-text)">
            {{ authorLabel }}
          </span>
        </div>

        <NuxtLink
          :to="`/articles/${post.slug}`"
          class="card-arrow flex h-10 w-10 items-center justify-center rounded-full border transition-all"
          style="border-color: var(--color-border)"
        >
          <Icon name="heroicons:arrow-up-right" class="h-5 w-5" />
        </NuxtLink>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth, useI18n, useToast } from '#imports'
import { calculateReadingTime } from '~/lib/blog'
import { resolveErrorMessage } from '~/composables/useErrorI18n'
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

const emit = defineEmits<{ deleted: [id: string | number] }>()

const { isAdmin } = useAuth()
const { t } = useI18n()
const { formatLocaleDate } = useTimezone()
const toast = useToast()

const readingTime = computed(() =>
  props.post.content ? calculateReadingTime(props.post.content) : null
)
const hasPrefetched = ref(false)
// E2E contract: expose hydration progress through a DOM attribute that
// survives production builds (unlike Vue's dev-only internal markers).
const isHydrated = ref(false)
onMounted(() => {
  isHydrated.value = true
})

const authorLabel = computed(() => {
  const name = props.post.author?.name?.trim()
  return name || t('blog.author')
})

const publishedAtLabel = computed(() => {
  if (!props.post.publishedAt) return ''
  return formatLocaleDate(props.post.publishedAt, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
})

const handleDelete = async () => {
  if (!confirm(t('blog.confirmDelete', { title: props.post.title }))) return

  try {
    await $fetch(`/api/blog/${props.post.id}`, { method: 'DELETE' })
    toast.success(t('blog.deleteSuccess'))
    emit('deleted', props.post.id)
  } catch (error: any) {
    console.error('Failed to delete post:', error)
    toast.error(resolveErrorMessage(error, t, t('blog.deleteFailed')))
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

.card-overlay {
  background: rgba(0, 0, 0, 0.12);
}

.group:hover .card-title {
  color: var(--color-primary);
}

.card-arrow:hover {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
</style>
