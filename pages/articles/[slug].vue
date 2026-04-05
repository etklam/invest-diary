<template>
  <main class="fintech-article-detail min-h-screen pb-24 text-slate-900 dark:text-slate-100">
    <div class="bg-grid absolute inset-0 -z-10 opacity-[0.08]" aria-hidden="true" />
    <div class="orb orb-cyan" aria-hidden="true" />
    <div class="orb orb-amber" aria-hidden="true" />

    <!-- Progress Bar -->
    <div
      class="fixed top-0 left-0 z-50 h-1 bg-sky-500 transition-all duration-150"
      :style="{ width: `${scrollProgress}%` }"
    />

    <div v-if="pending" class="mx-auto w-full max-w-4xl px-4 pt-20">
      <div class="mb-8 aspect-[21/9] animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
      <div class="mx-auto max-w-3xl space-y-6">
        <div class="h-4 w-24 animate-pulse rounded-full bg-slate-200/60 dark:bg-slate-800/60" />
        <div class="h-12 w-full animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
        <div class="h-4 w-2/3 animate-pulse rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
      </div>
    </div>

    <div
      v-else-if="error"
      class="mx-auto mt-20 w-full max-w-2xl px-4 text-center"
    >
      <div class="mb-6 flex justify-center">
        <div class="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-900/20">
          <Icon name="heroicons:exclamation-circle" class="h-10 w-10" />
        </div>
      </div>
      <h1 class="text-2xl font-bold text-slate-950 dark:text-white">{{ $t('blog.postNotFound') }}</h1>
      <p class="mt-3 text-slate-600 dark:text-slate-400">這篇文章可能已被移除或移動到其他網址。</p>
      <div class="mt-8 flex justify-center gap-4">
        <NuxtLink to="/articles" class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-950">
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
            class="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            <Icon name="heroicons:arrow-left" class="h-3 w-3" />
            {{ $t('blog.pageTitle') }}
          </NuxtLink>

          <div class="mb-6 flex justify-center">
            <span class="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
              {{ $t(`blog.categories.${categoryKey}`) || post.category }}
            </span>
          </div>

          <h1 class="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl lg:leading-[1.1]">
            {{ post.title }}
          </h1>

          <p v-if="post.excerpt" class="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-400">
            {{ post.excerpt }}
          </p>

          <div class="mt-10 flex flex-wrap items-center justify-center gap-6 border-y border-slate-100 py-8 dark:border-slate-800/50">
            <div class="flex items-center gap-3">
              <div class="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center dark:bg-slate-800">
                <Icon name="heroicons:user" class="h-6 w-6 text-slate-400 dark:text-slate-500" />
              </div>
              <div class="text-left">
                <p class="text-xs font-bold uppercase tracking-widest text-slate-400">{{ $t('blog.author') }}</p>
                <p class="text-sm font-bold text-slate-900 dark:text-white">{{ post.author.name || post.author.email }}</p>
              </div>
            </div>

            <div class="hidden h-8 w-px bg-slate-100 dark:bg-slate-800 sm:block" />

            <div class="text-left">
              <p class="text-xs font-bold uppercase tracking-widest text-slate-400">{{ $t('blog.publishedDate') }}</p>
              <p class="text-sm font-bold text-slate-900 dark:text-white">{{ publishedDateLabel }}</p>
            </div>

            <div class="hidden h-8 w-px bg-slate-100 dark:bg-slate-800 sm:block" />

            <div class="text-left">
              <p class="text-xs font-bold uppercase tracking-widest text-slate-400">{{ $t('blog.readingTimeLabel') || $t('blog.readingTime', { min: '' }).replace(':min', '').trim() }}</p>
              <p class="text-sm font-bold text-slate-900 dark:text-white">{{ readingTime }} {{ $t('blog.minute') }}</p>
            </div>
          </div>
        </div>

        <div v-if="post.coverImage" class="mx-auto mt-16 max-w-6xl px-4 lg:px-8">
          <div class="relative aspect-[21/9] overflow-hidden rounded-[2.5rem] shadow-2xl shadow-slate-200 dark:shadow-none">
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
          class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-xl ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:bg-sky-600 hover:text-white dark:bg-slate-900 dark:ring-slate-800"
        >
          <Icon name="heroicons:pencil" class="h-6 w-6" />
        </NuxtLink>
        <button
          @click="handleDelete"
          class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-600 shadow-xl ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:bg-red-600 hover:text-white dark:bg-slate-900 dark:ring-slate-800"
        >
          <Icon name="heroicons:trash" class="h-6 w-6" />
        </button>
      </div>

      <!-- Article Body -->
      <div class="mx-auto mt-16 max-w-3xl px-6 lg:mt-24 lg:px-0">
        <div
          class="prose prose-lg prose-slate dark:prose-invert max-w-none
          prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-950 dark:prose-headings:text-white
          prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-8
          prose-h3:text-2xl prose-h3:mt-12 prose-h3:mb-6
          prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-8
          prose-a:text-sky-600 dark:prose-a:text-sky-400 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-l-4 prose-blockquote:border-sky-500 prose-blockquote:bg-sky-50/50 dark:prose-blockquote:bg-sky-500/5 prose-blockquote:py-4 prose-blockquote:px-8 prose-blockquote:rounded-r-2xl prose-blockquote:italic
          prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-[''] prose-code:after:content-[''] prose-code:font-semibold
          prose-img:rounded-3xl prose-img:shadow-lg
          prose-hr:border-slate-100 dark:prose-hr:border-slate-800"
        >
          <div v-if="isHtmlContent" v-html="sanitizedContent" />
          <MDC v-else :value="post.content" />
        </div>

        <!-- Tags -->
        <div v-if="parsedTags.length > 0" class="mt-16 flex flex-wrap gap-2 border-t border-slate-100 pt-10 dark:border-slate-800">
          <span
            v-for="tag in parsedTags"
            :key="tag"
            class="inline-flex items-center rounded-xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-400"
          >
            #{{ tag }}
          </span>
        </div>

        <!-- Share & Footer -->
        <footer class="mt-20 rounded-[2.5rem] bg-slate-900 p-10 text-white dark:bg-slate-800/50">
          <div class="flex flex-col gap-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-2xl font-bold">{{ $t('blog.likeThisPost') }}</h3>
              <p class="mt-2 text-slate-400">{{ $t('blog.shareWithOthers') }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-4">
              <button
                @click="copyLink"
                class="flex h-14 items-center gap-3 rounded-2xl bg-white/10 px-8 text-sm font-bold transition-all hover:bg-white hover:text-slate-950"
              >
                <Icon :name="copied ? 'heroicons:check-circle' : 'heroicons:link'" class="h-5 w-5" />
                {{ copied ? $t('common.copied') : $t('blog.copyLink') }}
              </button>
            </div>
          </div>
        </footer>

        <div class="mt-16 flex justify-center">
          <NuxtLink to="/articles" class="group flex items-center gap-3 text-sm font-bold text-slate-500 transition-colors hover:text-slate-950 dark:hover:text-white">
            <Icon name="heroicons:arrow-left" class="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            {{ $t('blog.backToList') }}
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

const { data: post, pending, error } = await useAsyncData(`blog-${route.params.slug}`, () =>
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

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.fintech-article-detail {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background-color: #fcfcfd;
}

:global(.dark .fintech-article-detail) {
  background-color: #020617;
}

.bg-grid {
  background-image: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0);
  background-size: 48px 48px;
  color: rgb(15 23 42 / 0.1);
}

:global(.dark .bg-grid) {
  color: rgb(255 255 255 / 0.05);
}

.orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(100px);
  pointer-events: none;
  opacity: 0.4;
}

.orb-cyan {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%);
  top: -100px;
  right: -50px;
}

.orb-amber {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%);
  bottom: 20%;
  left: -100px;
}
</style>
