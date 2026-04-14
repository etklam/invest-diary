<template>
  <main class="min-h-screen pb-24">
    <!-- Reading Progress Bar -->
    <div
      class="fixed top-0 left-0 z-50 h-0.5 bg-accent transition-all duration-fast"
      :style="{ width: `${scrollProgress}%` }"
    />

    <!-- Loading State -->
    <div v-if="pending" class="max-w-[800px] mx-auto px-4 pt-16 space-y-6">
      <BaseSkeleton variant="card" height="320px" />
      <BaseSkeleton variant="text" :count="3" />
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="max-w-[600px] mx-auto mt-20 px-4 text-center"
    >
      <div class="mb-8 flex justify-center">
        <Icon name="lucide:alert-circle" class="h-12 w-12 text-semantic-error opacity-50" />
      </div>
      <h1 class="text-2xl font-semibold text-copy">{{ articleErrorTitle }}</h1>
      <p class="mt-3 text-copy-secondary text-sm">{{ articleErrorDescription }}</p>
      <div class="mt-8 flex justify-center gap-3">
        <BaseButton
          v-if="!isNotFoundError"
          variant="secondary"
          size="md"
          @click="refresh()"
        >
          <Icon name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
          {{ $t('blog.retryLoad') }}
        </BaseButton>
        <NuxtLink to="/articles">
          <BaseButton variant="primary" size="md">
            <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
            {{ $t('blog.backToList') }}
          </BaseButton>
        </NuxtLink>
      </div>
    </div>

    <!-- Article -->
    <article v-else-if="post" class="relative">
      <!-- Article Header -->
      <header class="max-w-[800px] mx-auto px-4 pt-16 text-center">
        <NuxtLink
          to="/articles"
          class="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-copy-muted hover:text-accent transition-colors"
        >
          <Icon name="lucide:arrow-left" class="h-3 w-3" />
          {{ $t('blog.pageTitle') }}
        </NuxtLink>

        <div class="mb-6 flex justify-center">
          <BaseBadge variant="info">
            {{ $t(`blog.categories.${categoryKey}`) || post.category }}
          </BaseBadge>
        </div>

        <h1 class="text-3xl font-semibold tracking-tight text-copy sm:text-4xl">
          {{ post.title }}
        </h1>

        <p v-if="post.excerpt" class="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-copy-secondary">
          {{ post.excerpt }}
        </p>

        <!-- Article Meta -->
        <div class="mt-8 flex flex-wrap items-center justify-center gap-6 border-y border-line py-6">
          <div class="flex items-center gap-2">
            <Icon name="lucide:user" class="h-4 w-4 text-copy-muted" />
            <div class="text-left">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-copy-muted">{{ $t('blog.author') }}</p>
              <p class="text-sm font-medium text-copy">{{ articleAuthorLabel }}</p>
            </div>
          </div>

          <span class="hidden h-6 w-px bg-line sm:block" />

          <div class="flex items-center gap-2">
            <Icon name="lucide:calendar" class="h-4 w-4 text-copy-muted" />
            <div class="text-left">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-copy-muted">{{ $t('blog.publishedDate') }}</p>
              <p class="text-sm font-medium text-copy">{{ publishedDateLabel }}</p>
            </div>
          </div>

          <span class="hidden h-6 w-px bg-line sm:block" />

          <div class="flex items-center gap-2">
            <Icon name="lucide:clock" class="h-4 w-4 text-copy-muted" />
            <div class="text-left">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-copy-muted">{{ $t('blog.readingTimeLabel') || 'Read' }}</p>
              <p class="text-sm font-medium text-copy">{{ readingTime }} {{ $t('blog.minute') }}</p>
            </div>
          </div>
        </div>
      </header>

      <!-- Cover Image -->
      <div v-if="post.coverImage" class="max-w-[960px] mx-auto mt-12 px-4">
        <div class="relative overflow-hidden">
          <NuxtImg
            :src="post.coverImage"
            :alt="post.title"
            width="1600"
            height="800"
            class="h-full w-full object-cover"
            loading="eager"
          />
        </div>
      </div>

      <!-- Admin Actions -->
      <div v-if="isAdmin" class="fixed bottom-8 left-8 z-40 hidden flex-col gap-3 lg:flex">
        <NuxtLink
          :to="`/admin/blog/${post.id}/edit`"
          class="flex h-10 w-10 items-center justify-center bg-surface border border-line text-copy-secondary hover:text-accent hover:border-accent transition-all"
        >
          <Icon name="lucide:pencil" class="h-4 w-4" />
        </NuxtLink>
        <button
          type="button"
          @click="handleDelete"
          class="flex h-10 w-10 items-center justify-center bg-surface border border-line text-copy-secondary hover:text-semantic-error hover:border-semantic-error transition-all"
        >
          <Icon name="lucide:trash-2" class="h-4 w-4" />
        </button>
      </div>

      <!-- Article Body -->
      <div class="mx-auto mt-12 max-w-[720px] px-4 lg:px-0">
        <div
          class="prose prose-base prose-slate dark:prose-invert max-w-none
          prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-copy
          prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
          prose-p:text-copy-secondary prose-p:leading-relaxed prose-p:mb-6
          prose-a:text-accent prose-a:font-medium prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-l-2 prose-blockquote:border-accent prose-blockquote:bg-surface-alt prose-blockquote:py-3 prose-blockquote:px-6 prose-blockquote:not-italic
          prose-code:bg-surface-alt prose-code:px-1.5 prose-code:py-0.5 prose-code:text-copy prose-code:before:content-[''] prose-code:after:content-[''] prose-code:font-medium
          prose-img:border prose-img:border-line
          prose-hr:border-line"
        >
          <div v-if="isHtmlContent" v-html="sanitizedContent" />
          <MDC v-else :value="post.content" />
        </div>

        <!-- Tags -->
        <div v-if="parsedTags.length > 0" class="mt-12 flex flex-wrap gap-2 border-t border-line pt-8">
          <span
            v-for="tag in parsedTags"
            :key="tag"
            class="text-[10px] text-copy-muted font-medium uppercase"
          >
            #{{ tag }}
          </span>
        </div>

        <!-- Share Footer -->
        <footer class="mt-16 p-8 bg-surface-alt border border-line">
          <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-lg font-semibold text-copy">{{ $t('blog.likeThisPost') }}</h3>
              <p class="mt-1 text-sm text-copy-secondary">{{ $t('blog.shareWithOthers') }}</p>
            </div>
            <BaseButton variant="secondary" size="md" @click="copyLink">
              <Icon :name="copied ? 'lucide:check' : 'lucide:link'" class="mr-2 h-4 w-4" />
              {{ copied ? $t('common.copied') : $t('blog.copyLink') }}
            </BaseButton>
          </div>
        </footer>

        <div class="mt-12 flex justify-start">
          <NuxtLink to="/articles">
            <BaseButton variant="ghost" size="md">
              <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
              {{ $t('blog.backToList') }}
            </BaseButton>
          </NuxtLink>
        </div>
      </div>
    </article>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import DOMPurify from 'dompurify'
import type { Config as DOMPurifyConfig } from 'dompurify'
import { calculateReadingTime, looksLikeHtmlContent, parseTags } from '~/lib/blog'
import { usePerformance } from '~/composables/usePerformance'
import { normalizeCategory } from '~/types/blog'

definePageMeta({
  requiresAuth: false
})

const route = useRoute()
const { t, locale } = useI18n()
const config = useRuntimeConfig()
const { isAdmin } = useAuth()
const copied = ref(false)
const toast = useToast()
const router = useRouter()
const siteUrl = String(config.public.siteUrl || 'https://trade-basic.com').replace(/\/+$/, '')

const { data: post, pending, error, refresh } = await useAsyncData(`blog-${route.params.slug}`, () =>
  $fetch<any>(`/api/blog/${route.params.slug}`)
)

usePerformance()

const scrollProgress = ref(0)
const updateScrollProgress = () => {
  if (!process.client) return
  const h = document.documentElement,
    b = document.body,
    st = 'scrollTop',
    sh = 'scrollHeight'
  scrollProgress.value = (h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight) * 100
}

onMounted(() => {
  window.addEventListener('scroll', updateScrollProgress)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollProgress)
})

const readingTime = computed(() => (post.value ? calculateReadingTime(post.value.content) : 0))
const parsedTags = computed(() => (post.value ? parseTags(post.value.tags) : []))
const getErrorStatusCode = (value: unknown): number | null => {
  if (!value || typeof value !== 'object') return null
  const candidate = value as {
    statusCode?: number
    status?: number
    data?: { statusCode?: number }
    cause?: { statusCode?: number }
  }
  return candidate.statusCode ?? candidate.status ?? candidate.data?.statusCode ?? candidate.cause?.statusCode ?? null
}
const isNotFoundError = computed(() => getErrorStatusCode(error.value) === 404)
const articleErrorTitle = computed(() =>
  isNotFoundError.value ? t('blog.postNotFound') : t('blog.loadFailed')
)
const articleErrorDescription = computed(() =>
  isNotFoundError.value ? t('blog.postMissingDescription') : t('blog.loadFailedDescription')
)
const articleAuthorLabel = computed(() => {
  const name = post.value?.author?.name?.trim()
  return name || t('blog.author')
})
const publishedDateLabel = computed(() => {
  if (!post.value?.publishedAt) return ''
  return new Intl.DateTimeFormat(locale.value === 'zh-TW' ? 'zh-TW' : 'en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(post.value.publishedAt))
})

const categoryKey = computed(() => {
  if (!post.value) return ''
  return normalizeCategory(post.value.category)
})

const htmlSanitizeConfig: DOMPurifyConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr', 'span', 'div'
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'class'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|data:image\/(?:png|jpe?g|gif|webp|svg\+xml);)/i
}

const isHtmlContent = computed(() => {
  if (!post.value?.content) return false
  const type = post.value?.contentType ? String(post.value.contentType).toLowerCase() : ''
  if (type === 'html') return true
  if (type === 'markdown') return false
  return looksLikeHtmlContent(post.value.content)
})

const sanitizedContent = computed(() => {
  if (!post.value?.content) return ''
  if (typeof DOMPurify?.sanitize !== 'function') {
    return post.value.content
  }
  return DOMPurify.sanitize(post.value.content, htmlSanitizeConfig)
})

const canonicalUrl = computed(() => {
  const slug = String(post.value?.slug || route.params.slug || '').trim()
  if (!slug) return `${siteUrl}/articles`
  return `${siteUrl}/articles/${encodeURIComponent(slug)}`
})

useHead(() => ({
  title: post.value ? `${post.value.title} - ${t('blog.pageTitle')}` : t('blog.loadingTitle'),
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  meta: post.value
    ? [
        { name: 'description', content: post.value.excerpt || t('blog.description') },
        { property: 'og:title', content: post.value.title },
        { property: 'og:description', content: post.value.excerpt || t('blog.description') },
        { property: 'og:type', content: 'article' },
        { property: 'og:url', content: canonicalUrl.value },
        { property: 'og:image', content: post.value.coverImage || '' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: post.value.title },
        { name: 'twitter:description', content: post.value.excerpt || t('blog.description') },
        { name: 'twitter:image', content: post.value.coverImage || '' }
      ]
    : [
        { name: 'robots', content: 'noindex, nofollow' }
      ]
}))

const copyLink = async () => {
  const url = window.location.href
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy link:', err)
  }
}

const handleDelete = async () => {
  if (!post.value) return
  if (!confirm(t('blog.confirmDelete', { title: post.value.title }))) return

  try {
    await $fetch(`/api/blog/${post.value.id}`, { method: 'DELETE' })
    toast.success(t('blog.deleteSuccess'))
    await router.push('/articles')
  } catch (apiError: any) {
    console.error('Failed to delete post:', apiError)
    toast.error(apiError.data?.statusMessage || t('blog.deleteFailed'))
  }
}
</script>
