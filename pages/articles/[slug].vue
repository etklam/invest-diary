<template>
  <main class="fintech-blog-post min-h-screen px-4 py-6 text-slate-900 sm:py-10 dark:text-slate-100">
    <div class="bg-grid absolute inset-0 -z-10 opacity-30" aria-hidden="true" />
    <div class="orb orb-cyan" aria-hidden="true" />
    <div class="orb orb-amber" aria-hidden="true" />

    <div v-if="pending" class="mx-auto w-full max-w-3xl animate-pulse">
      <div class="glass-shell mb-8 h-64 rounded-2xl" />
      <div class="glass-shell mb-4 h-6 w-1/3 rounded-xl" />
      <div class="glass-shell mb-6 h-10 w-3/4 rounded-xl" />
      <div class="space-y-3">
        <div class="glass-shell h-4 w-full rounded-xl" />
        <div class="glass-shell h-4 w-11/12 rounded-xl" />
        <div class="glass-shell h-4 w-10/12 rounded-xl" />
        <div class="glass-shell h-4 w-9/12 rounded-xl" />
      </div>
    </div>

    <div
      v-else-if="error"
      class="mx-auto w-full max-w-3xl rounded-2xl border border-red-300/70 bg-red-50/90 p-4 text-red-900 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300"
    >
      <div class="flex items-start gap-3">
        <i-heroicons-x-circle class="h-5 w-5" />
        <div>
          <h3 class="text-sm font-medium">
            {{ $t('blog.postNotFound') }}
          </h3>
          <div class="mt-3 flex flex-wrap gap-2">
            <button class="btn btn-red" type="button" @click="refresh()">
              {{ $t('blog.retryLoad') }}
            </button>
            <NuxtLink to="/articles" class="btn btn-sky">
              {{ $t('blog.backToList') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <article v-else-if="post" class="mx-auto w-full max-w-4xl">
      <div v-if="isAdmin" class="mb-6 flex w-full flex-wrap justify-center gap-2 sm:justify-end">
        <NuxtLink
          :to="`/admin/blog/${post.id}/edit`"
          class="btn btn-sky"
        >
          <i-heroicons-pencil class="btn-icon" />
          <span class="btn-label">{{ $t('blog.editPost') }}</span>
        </NuxtLink>
        <button
          class="btn btn-red"
          type="button"
          @click="handleDelete"
        >
          <i-heroicons-trash class="btn-icon" />
          <span class="btn-label">{{ $t('common.delete') }}</span>
        </button>
      </div>

      <nav class="glass-shell mb-5 rounded-xl px-4 py-3 text-sm">
        <ol class="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
          <li>
            <NuxtLink to="/" class="cursor-pointer transition-colors duration-200 hover:text-slate-800 dark:hover:text-slate-200">
              {{ $t('common.appName') }}
            </NuxtLink>
          </li>
          <li>/</li>
          <li>
            <NuxtLink to="/articles" class="cursor-pointer transition-colors duration-200 hover:text-slate-800 dark:hover:text-slate-200">
              {{ $t('blog.pageTitle') }}
            </NuxtLink>
          </li>
          <li>/</li>
          <li class="max-w-[200px] truncate font-medium text-slate-900 dark:text-slate-100">
            {{ post.title }}
          </li>
        </ol>
      </nav>

      <div
        v-if="post.coverImage"
        class="glass-shell mb-8 overflow-hidden rounded-2xl"
      >
        <NuxtImg
          :src="post.coverImage"
          :alt="post.title"
          width="1200"
          height="675"
          format="webp"
          loading="eager"
          class="max-h-[500px] w-full object-cover"
        />
      </div>

      <header class="glass-shell mb-6 rounded-2xl p-5 sm:p-6">
        <div class="mb-4">
          <span
            class="inline-flex items-center rounded-full border border-amber-300/60 bg-amber-100/70 px-3 py-1 text-sm font-semibold text-amber-700 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-300"
          >
            {{ $t(`blog.categories.${categoryKey}`) || post.category }}
          </span>
        </div>

        <h1 class="mb-3 text-2xl font-bold leading-snug text-slate-950 sm:text-3xl lg:text-4xl dark:text-white">
          {{ post.title }}
        </h1>

        <PostMeta
          :author="post.author.name || post.author.email"
          :date="post.publishedAt!"
          :reading-time="readingTime"
        />

        <div v-if="parsedTags.length > 0" class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="tag in parsedTags"
            :key="tag"
            class="inline-flex items-center rounded-full border border-sky-200/70 bg-sky-50/70 px-3 py-1 text-sm text-sky-700 dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-300"
          >
            #{{ tag }}
          </span>
        </div>
      </header>

      <div class="glass-shell mb-6 rounded-2xl p-4 sm:p-6">
        <div
          class="prose prose-lg prose-slate dark:prose-invert max-w-none
          prose-headings:font-semibold prose-headings:text-slate-950 dark:prose-headings:text-slate-100 prose-headings:scroll-mt-20
          prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-6
          prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-5
          prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4
          prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
          prose-a:text-sky-700 dark:prose-a:text-sky-300 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
          prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-strong:font-semibold
          prose-em:text-slate-800 dark:prose-em:text-slate-200
          prose-code:text-fuchsia-600 dark:prose-code:text-fuchsia-300 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-[''] prose-code:font-mono
          prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-lg prose-pre:shadow-lg
          prose-pre:px-4 prose-pre:py-4 prose-pre:my-6
          prose-ul:text-slate-700 dark:prose-ul:text-slate-300 prose-ul:ml-4
          prose-ol:text-slate-700 dark:prose-ol:text-slate-300 prose-ol:ml-4
          prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-li:marker:text-slate-500
          prose-blockquote:border-l-4 prose-blockquote:border-sky-500 prose-blockquote:bg-sky-50/60 dark:prose-blockquote:bg-slate-800/40 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:italic prose-blockquote:text-slate-700 dark:prose-blockquote:text-slate-300 prose-blockquote:rounded-r-lg
          prose-hr:border-slate-300 dark:prose-hr:border-slate-700 prose-hr:my-8
          prose-img:rounded-lg prose-img:shadow-xl prose-img:my-6
          prose-table:border-collapse prose-table:my-6 prose-table:w-full
          prose-thead:border-b prose-thead:border-slate-300 dark:prose-thead:border-slate-700 prose-thead:bg-slate-100/70 dark:prose-thead:bg-slate-800/60
          prose-th:text-slate-900 dark:prose-th:text-slate-100 prose-th:font-semibold prose-th:px-4 prose-th:py-3
          prose-td:text-slate-700 dark:prose-td:text-slate-300 prose-td:border-b prose-td:border-slate-200 dark:prose-td:border-slate-800 prose-td:px-4 prose-td:py-3"
        >
          <MDC :value="post.content" />
        </div>
      </div>

      <div class="glass-shell mb-6 rounded-2xl p-4 sm:p-6">
        <h3 class="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          {{ $t('blog.share') }}
        </h3>

        <div class="flex w-full flex-wrap items-center justify-center gap-4">
          <button class="btn btn-ink" @click="copyLink">
            <i-heroicons-link class="btn-icon" />
            <span class="btn-label">{{ $t('blog.copyLink') }}</span>
          </button>

          <span v-if="copied" class="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
            <i-heroicons-check-circle class="h-4 w-4" />
            {{ $t('blog.linkCopied') }}
          </span>
        </div>
      </div>

      <div class="flex w-full items-center justify-center pb-8">
        <NuxtLink to="/articles" class="btn btn-sky">
          <i-heroicons-arrow-left class="btn-icon" />
          <span class="btn-label">{{ $t('blog.backToList') }}</span>
        </NuxtLink>
      </div>
    </article>
  </main>
</template>

<script setup lang="ts">
definePageMeta({
  requiresAuth: false
})

import { calculateReadingTime, parseTags } from '~/lib/blog'
import { usePerformance } from '~/composables/usePerformance'
import { normalizeCategory } from '~/types/blog'

interface Post {
  id: string | number
  title: string
  slug: string
  excerpt?: string | null
  coverImage?: string | null
  category: string
  tags?: string | null
  publishedAt: Date | string
  content: string
  author: {
    id: string | number
    name: string | null
    email: string
  }
}

const route = useRoute()
const { t } = useI18n()
const config = useRuntimeConfig()
const { isAdmin } = useAuth()
const copied = ref(false)
const toast = useToast()
const router = useRouter()
const siteUrl = String(config.public.siteUrl || 'https://trade-basic.com').replace(/\/+$/, '')

const { data: post, pending, error, refresh } = await useAsyncData(`blog-${route.params.slug}`, () =>
  $fetch<Post>(`/api/blog/${route.params.slug}`)
)

usePerformance()

const readingTime = computed(() => (post.value ? calculateReadingTime(post.value.content) : 0))
const parsedTags = computed(() => (post.value ? parseTags(post.value.tags) : []))

const categoryKey = computed(() => {
  if (!post.value) return ''
  return normalizeCategory(post.value.category)
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

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

.fintech-blog-post {
  position: relative;
  overflow: hidden;
  font-family: 'IBM Plex Sans', 'Avenir Next', 'Segoe UI', sans-serif;
  background:
    radial-gradient(1200px 700px at 12% -10%, rgb(56 189 248 / 16%), transparent 58%),
    radial-gradient(1100px 620px at 95% -5%, rgb(245 158 11 / 12%), transparent 62%),
    rgb(240 249 255);
}

:global(.dark .fintech-blog-post),
:global(.dark-mode .fintech-blog-post) {
  background:
    radial-gradient(1100px 640px at 10% -10%, rgb(56 189 248 / 9%), transparent 58%),
    radial-gradient(900px 520px at 95% -8%, rgb(245 158 11 / 7%), transparent 62%),
    rgb(2 8 23);
}

.bg-grid {
  background-image:
    linear-gradient(to right, rgb(12 74 110 / 6%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(12 74 110 / 6%) 1px, transparent 1px);
  background-size: 36px 36px;
}

:global(.dark .bg-grid),
:global(.dark-mode .bg-grid) {
  opacity: 0.14;
  background-image:
    linear-gradient(to right, rgb(148 163 184 / 10%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(148 163 184 / 10%) 1px, transparent 1px);
}

.orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(58px);
  pointer-events: none;
}

.orb-cyan {
  width: 260px;
  height: 260px;
  background: rgb(56 189 248 / 27%);
  top: 24px;
  right: 7%;
}

.orb-amber {
  width: 220px;
  height: 220px;
  background: rgb(245 158 11 / 22%);
  bottom: 10%;
  left: 8%;
}

.glass-shell {
  border: 1px solid rgb(186 230 253 / 80%);
  background: rgb(255 255 255 / 82%);
  backdrop-filter: blur(9px);
}

:global(.dark .glass-shell),
:global(.dark-mode .glass-shell) {
  border-color: rgb(71 85 105);
  background: rgb(10 16 30 / 86%);
}

.btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  border-radius: 0.75rem;
  border-width: 1px;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s ease;
  text-decoration: none;
  cursor: pointer;
  outline: none;
}

.btn:focus-visible {
  box-shadow: 0 0 0 2px rgb(14 165 233 / 35%);
}

.btn-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  height: 1.25rem;
  width: 1.25rem;
  transform: translateY(-50%);
  pointer-events: none;
}

.btn-label {
  display: block;
  text-align: center;
}

.btn-sky {
  min-width: 9.5rem;
  padding: 0.625rem 1rem;
  border-color: rgb(14 165 233 / 35%);
  background: rgb(224 242 254 / 75%);
  color: rgb(3 105 161);
}

.btn-sky:hover {
  border-color: rgb(14 165 233 / 60%);
  background: rgb(224 242 254 / 95%);
}

.btn-red {
  min-width: 9.5rem;
  padding: 0.625rem 1rem;
  border-color: rgb(239 68 68 / 35%);
  background: rgb(254 226 226 / 75%);
  color: rgb(153 27 27);
}

.btn-red:hover {
  border-color: rgb(239 68 68 / 58%);
  background: rgb(254 226 226 / 95%);
}

.btn-ink {
  min-width: 9.5rem;
  padding: 0.625rem 1rem;
  border-color: rgb(71 85 105 / 45%);
  background: rgb(15 23 42 / 92%);
  color: rgb(226 232 240);
}

.btn-ink:hover {
  border-color: rgb(100 116 139 / 60%);
  background: rgb(30 41 59);
}

:global(.dark .btn-sky),
:global(.dark-mode .btn-sky) {
  border-color: rgb(56 189 248 / 45%);
  background: rgb(12 74 110 / 35%);
  color: rgb(186 230 253);
}

:global(.dark .btn-sky:hover),
:global(.dark-mode .btn-sky:hover) {
  border-color: rgb(56 189 248 / 70%);
  background: rgb(8 47 73);
}

:global(.dark .btn-red),
:global(.dark-mode .btn-red) {
  border-color: rgb(248 113 113 / 35%);
  background: rgb(127 29 29 / 32%);
  color: rgb(254 202 202);
}

:global(.dark .btn-red:hover),
:global(.dark-mode .btn-red:hover) {
  border-color: rgb(248 113 113 / 55%);
  background: rgb(127 29 29 / 50%);
}

@media (prefers-reduced-motion: reduce) {
  .btn {
    transition: none;
  }
}
</style>
