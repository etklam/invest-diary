<template>
  <div class="fintech-article-detail min-h-screen pb-24" style="color: var(--color-text)">

    <!-- Progress Bar -->
    <div
      class="fixed top-0 left-0 z-50 h-1 transition-all duration-150"
      :style="{ width: `${scrollProgress}%`, background: 'var(--color-secondary)' }"
    />

    <div v-if="pending" class="mx-auto w-full max-w-4xl px-4 pt-20">
      <AppSkeleton variant="article" />
    </div>

    <div
      v-else-if="error"
      class="mx-auto mt-20 w-full max-w-2xl px-4 text-center"
    >
      <div class="mb-6 flex justify-center">
        <div class="flex h-20 w-20 items-center justify-center rounded-full" style="background: color-mix(in srgb, var(--color-danger) 10%, transparent); color: var(--color-danger)">
          <Icon name="heroicons:exclamation-circle" class="h-10 w-10" />
        </div>
      </div>
      <h1 class="text-2xl font-bold" style="color: var(--color-text)">{{ articleErrorTitle }}</h1>
      <p class="mt-3" style="color: var(--color-text-muted)">{{ articleErrorDescription }}</p>
      <div class="mt-8 flex justify-center gap-4">
        <button
          v-if="!isNotFoundError"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-bold transition-all"
          style="border-color: var(--color-border); color: var(--color-text)"
          @click="refresh()"
        >
          <Icon name="heroicons:arrow-path" class="h-4 w-4" />
          {{ $t('blog.retryLoad') }}
        </button>
        <NuxtLink to="/articles" class="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all" style="background: var(--color-primary)">
          <Icon name="heroicons:arrow-left" class="h-4 w-4" />
          {{ $t('blog.backToList') }}
        </NuxtLink>
      </div>
    </div>

    <article v-else-if="post" class="relative">
      <!-- Article Hero -->
      <header class="relative px-4 pt-16 sm:pt-24 lg:pt-32">
        <div class="mx-auto max-w-4xl text-center">
          <NuxtLink
            to="/articles"
            class="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest blog-back-link"
            style="color: var(--color-secondary)"
          >
            <Icon name="heroicons:arrow-left" class="h-3 w-3" />
            {{ $t('blog.pageTitle') }}
          </NuxtLink>

          <div class="mb-6 flex justify-center">
            <span class="inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest" style="border-color: color-mix(in srgb, var(--color-secondary) 25%, transparent); background: color-mix(in srgb, var(--color-secondary) 8%, transparent); color: var(--color-secondary)">
              {{ $t(`blog.categories.${categoryKey}`) || post.category }}
            </span>
          </div>

          <h1 class="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.1]" style="color: var(--color-text)">
            {{ post.title }}
          </h1>

          <p v-if="post.excerpt" class="mx-auto mt-8 max-w-2xl text-xl leading-relaxed" style="color: var(--color-text-muted)">
            {{ post.excerpt }}
          </p>

          <div class="mt-10 flex flex-wrap items-center justify-center gap-6 border-y py-8" style="border-color: var(--color-border)">
            <div class="flex items-center gap-3">
              <div class="h-12 w-12 rounded-full flex items-center justify-center" style="background: var(--color-surface-strong)">
                <Icon name="heroicons:user" class="h-6 w-6" style="color: var(--color-text-soft)" />
              </div>
              <div class="text-left">
                <p class="text-xs font-bold uppercase tracking-widest" style="color: var(--color-text-soft)">{{ $t('blog.author') }}</p>
                <p class="text-sm font-bold" style="color: var(--color-text)">{{ articleAuthorLabel }}</p>
              </div>
            </div>

            <div class="hidden h-8 w-px sm:block" style="background: var(--color-border)" />

            <div class="text-left">
              <p class="text-xs font-bold uppercase tracking-widest" style="color: var(--color-text-soft)">{{ $t('blog.publishedDate') }}</p>
              <p class="text-sm font-bold" style="color: var(--color-text)">{{ publishedDateLabel }}</p>
            </div>

            <div class="hidden h-8 w-px sm:block" style="background: var(--color-border)" />

            <div class="text-left">
              <p class="text-xs font-bold uppercase tracking-widest" style="color: var(--color-text-soft)">{{ $t('blog.readingTimeLabel') || $t('blog.readingTime', { min: '' }).replace(':min', '').trim() }}</p>
              <p class="text-sm font-bold" style="color: var(--color-text)">{{ readingTime }} {{ $t('blog.minute') }}</p>
            </div>
          </div>
        </div>

        <div v-if="post.coverImage" class="mx-auto mt-16 max-w-6xl px-4 lg:px-8">
          <div class="relative aspect-[21/9] overflow-hidden rounded-[2.5rem]" style="box-shadow: var(--shadow-lg)">
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
      </header>

      <!-- Admin Actions -->
      <div v-if="isAdmin" class="fixed bottom-8 left-8 z-40 hidden flex-col gap-3 lg:flex">
        <NuxtLink
          :to="`/admin/blog/${post.id}/edit`"
          :aria-label="$t('common.edit')"
          class="admin-action-btn flex h-12 w-12 items-center justify-center rounded-dt-md shadow-dt-lg ring-1 transition-colors"
          style="background: var(--color-surface); color: var(--color-secondary); --tw-ring-color: var(--color-border)"
        >
          <Icon name="heroicons:pencil" class="h-6 w-6" />
        </NuxtLink>
        <button
          :aria-label="$t('common.delete')"
          class="admin-action-btn flex h-12 w-12 items-center justify-center rounded-dt-md shadow-dt-lg ring-1 transition-colors"
          style="background: var(--color-surface); color: var(--color-danger); --tw-ring-color: var(--color-border)"
          @click="handleDelete"
        >
          <Icon name="heroicons:trash" class="h-6 w-6" />
        </button>
      </div>

      <!-- Article Body -->
      <div class="mx-auto mt-16 max-w-3xl px-6 lg:mt-24 lg:px-0">
        <div
          class="article-prose prose prose-lg max-w-none
          prose-headings:font-bold prose-headings:tracking-tight
          prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-8
          prose-h3:text-2xl prose-h3:mt-12 prose-h3:mb-6
          prose-p:leading-relaxed prose-p:mb-8
          prose-a:font-bold prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-l-4 prose-blockquote:py-4 prose-blockquote:px-8 prose-blockquote:rounded-r-2xl prose-blockquote:italic
          prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-[''] prose-code:after:content-[''] prose-code:font-semibold
          prose-img:rounded-dt-md prose-img:shadow-lg"
        >
          <div v-if="isHtmlContent" v-html="sanitizedContent" />
          <MDCRenderer
            v-else-if="articleMarkdown?.body"
            :key="articleContentCacheKey"
            :body="articleMarkdown.body"
            :data="articleMarkdown.data"
          />
          <div v-else-if="articleMarkdownPending" class="space-y-3">
            <div class="h-4 w-full animate-pulse rounded-lg" style="background: var(--color-surface-strong)" />
            <div class="h-4 w-4/5 animate-pulse rounded-lg" style="background: var(--color-surface-strong)" />
            <div class="h-4 w-2/3 animate-pulse rounded-lg" style="background: var(--color-surface-strong)" />
          </div>
          <pre v-else-if="articleMarkdownError" class="whitespace-pre-wrap break-words font-sans text-base leading-relaxed" style="color: var(--color-text-muted)">{{ articleContent }}</pre>
          <p v-else class="leading-relaxed" style="color: var(--color-text-muted)">
            {{ $t('blog.contentUnavailable') }}
          </p>
        </div>

        <!-- Tags -->
        <div v-if="parsedTags.length > 0" class="mt-16 flex flex-wrap gap-2 border-t pt-10" style="border-color: var(--color-border)">
          <span
            v-for="tag in parsedTags"
            :key="tag"
            class="inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold"
            style="background: var(--color-surface-strong); color: var(--color-text-muted)"
          >
            #{{ tag }}
          </span>
        </div>

        <!-- Share & Footer -->
        <footer class="mt-20 rounded-[2.5rem] p-10 text-white" style="background: var(--color-primary)">
          <div class="flex flex-col gap-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-2xl font-bold">{{ $t('blog.likeThisPost') }}</h3>
              <p class="mt-2" style="opacity: 0.7">{{ $t('blog.shareWithOthers') }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-4">
              <button
                @click="copyLink"
                class="flex h-14 items-center gap-3 rounded-2xl px-8 text-sm font-bold transition-all" style="background: rgba(255,255,255,0.12)"
              >
                <Icon :name="copied ? 'heroicons:check-circle' : 'heroicons:link'" class="h-5 w-5" />
                {{ copied ? $t('common.copied') : $t('blog.copyLink') }}
              </button>
            </div>
          </div>
        </footer>

        <div class="mt-16 flex justify-center">
          <NuxtLink to="/articles" class="group flex items-center gap-3 text-sm font-bold transition-colors" style="color: var(--color-text-soft)">
            <Icon name="heroicons:arrow-left" class="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            {{ $t('blog.backToList') }}
          </NuxtLink>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import DOMPurify from 'dompurify'
import type { Config as DOMPurifyConfig } from 'dompurify'
import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import type { MDCParserResult } from '@nuxtjs/mdc'
import { calculateReadingTime, looksLikeHtmlContent, parseTags } from '~/lib/blog'
import { usePerformance } from '~/composables/usePerformance'
import { resolveErrorMessage } from '~/composables/useErrorI18n'
import { normalizeCategory } from '~/types/blog'

definePageMeta({
  requiresAuth: false
})

const route = useRoute()
const { t } = useI18n()
const { formatLocaleDate } = useTimezone()
const config = useRuntimeConfig()
const { isAdmin } = useAuth()
const copied = ref(false)
const toast = useToast()
const router = useRouter()
const siteUrl = String(config.public.siteUrl || 'https://trade-basic.com').replace(/\/+$/, '')

const normalizeRouteSlug = (value: unknown) => {
  const rawSlug = Array.isArray(value) ? value[0] : value
  return typeof rawSlug === 'string' ? rawSlug.trim() : ''
}

const getErrorStatusCode = (value: unknown): number | null => {
  if (!value || typeof value !== 'object') return null
  const candidate = value as {
    statusCode?: number
    status?: number
    response?: { status?: number }
    data?: { statusCode?: number }
    cause?: { statusCode?: number }
  }
  return candidate.statusCode
    ?? candidate.status
    ?? candidate.response?.status
    ?? candidate.data?.statusCode
    ?? candidate.cause?.statusCode
    ?? null
}

const isRetriableFetchError = (value: unknown) => {
  const statusCode = getErrorStatusCode(value)
  return statusCode === null || statusCode >= 500
}

const fetchBlogPostWithRetry = async (slug: string) => {
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  try {
    return await $fetch<any>(`/api/blog/${encodeURIComponent(slug)}`)
  } catch (err) {
    if (!isRetriableFetchError(err)) {
      throw err
    }

    return await $fetch<any>(`/api/blog/${encodeURIComponent(slug)}`)
  }
}

const normalizedSlug = computed(() => normalizeRouteSlug(route.params.slug))
const blogPostCacheKey = computed(() => `blog-${normalizedSlug.value || 'missing'}`)

const { data: post, pending, error, refresh } = await useAsyncData(
  blogPostCacheKey,
  () => fetchBlogPostWithRetry(normalizedSlug.value),
  {
    watch: [normalizedSlug],
    dedupe: 'defer',
  },
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

const articleContent = computed(() => typeof post.value?.content === 'string' ? post.value.content : '')
const articleContentCacheKey = computed(() => {
  const id = post.value?.id ? String(post.value.id) : (normalizedSlug.value || 'unknown')
  const updatedAt = post.value?.updatedAt ? String(post.value.updatedAt) : ''
  return `article-mdc-${id}-${updatedAt || articleContent.value.length}`
})
const readingTime = computed(() => (articleContent.value ? calculateReadingTime(articleContent.value) : 0))
const parsedTags = computed(() => (post.value ? parseTags(post.value.tags) : []))
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
  return formatLocaleDate(post.value.publishedAt, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
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
  if (!articleContent.value) return false
  const type = post.value?.contentType ? String(post.value.contentType).toLowerCase() : ''
  if (type === 'html') return true
  if (type === 'markdown') return false
  return looksLikeHtmlContent(articleContent.value)
})

const emptyMarkdownDocument: MDCParserResult = {
  data: {
    title: '',
    description: '',
  },
  body: {
    type: 'root',
    children: [],
  },
  excerpt: undefined,
  toc: undefined,
}

// Use useAsyncData so markdown parsing is awaited during SSR
const {
  data: articleMarkdown,
  pending: articleMarkdownPending,
  error: articleMarkdownError,
} = await useAsyncData(
  articleContentCacheKey,
  async () => {
    if (!articleContent.value || isHtmlContent.value) return emptyMarkdownDocument
    try {
      return await parseMarkdown(articleContent.value, {
        toc: false,
        contentHeading: false,
      }) || emptyMarkdownDocument
    } catch (parseError) {
      // Shiki/rehype-pretty-code uses WebAssembly. If WASM is blocked
      // (CSP, browser support), the error is caught here so the template
      // can fall back to showing raw markdown text instead of crashing.
      if (process.server) throw parseError
      console.error('[article-mdc] client-side markdown parse failed', parseError)
      throw parseError
    }
  },
  {
    watch: [articleContentCacheKey],
    dedupe: 'defer',
  },
)

const sanitizedContent = computed(() => {
  if (!articleContent.value) return ''
  if (typeof DOMPurify?.sanitize !== 'function') {
    return articleContent.value
  }
  return DOMPurify.sanitize(articleContent.value, htmlSanitizeConfig)
})

const canonicalUrl = computed(() => {
  const slug = String(post.value?.slug || normalizedSlug.value || '').trim()
  if (!slug) return `${siteUrl}/articles`
  return `${siteUrl}/articles/${encodeURIComponent(slug)}`
})

// Structured data for search engines and AI
const { injectBlogPostingSchema, injectBreadcrumbSchema } = useStructuredData()
injectBlogPostingSchema({
  get title() { return post.value?.title },
  get excerpt() { return post.value?.excerpt || undefined },
  get coverImage() { return post.value?.coverImage || undefined },
  get publishedAt() { return post.value?.publishedAt },
  get updatedAt() { return post.value?.updatedAt },
  get slug() { return String(post.value?.slug || normalizedSlug.value || '') },
  get author() { return post.value?.author },
})
injectBreadcrumbSchema([
  { name: t('nav.home'), url: '/' },
  { name: t('blog.pageTitle'), url: '/articles' },
  { name: post.value?.title || '' },
])

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
  } catch {
    toast.error('複製連結失敗，請手動複製')
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
    toast.error(resolveErrorMessage(apiError, t, t('blog.deleteFailed')))
  }
}
</script>

<style scoped>
.fintech-article-detail {
  background-color: var(--color-background);
}

.article-prose {
  color: var(--color-text);
}
.article-prose :deep(h1),
.article-prose :deep(h2),
.article-prose :deep(h3),
.article-prose :deep(h4),
.article-prose :deep(h5),
.article-prose :deep(h6) {
  color: var(--color-text);
}
.article-prose :deep(p) {
  color: var(--color-text-muted);
}
.article-prose :deep(a) {
  color: var(--color-secondary);
}
.article-prose :deep(blockquote) {
  border-color: var(--color-secondary);
  background: color-mix(in srgb, var(--color-secondary) 6%, transparent);
}
.article-prose :deep(code) {
  background: var(--color-surface-strong);
}
.article-prose :deep(hr) {
  border-color: var(--color-border);
}
.article-prose :deep(strong) {
  color: var(--color-text);
}

.admin-action-btn:hover {
  background: var(--color-primary) !important;
  color: #fff !important;
}

.blog-back-link:hover {
  opacity: 0.75;
}
</style>
