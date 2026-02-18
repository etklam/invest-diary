<template>
  <!-- Mobile-first, dark-first container -->
  <div class="mx-auto w-full max-w-4xl px-4 py-4 sm:py-8 bg-gray-950 text-gray-100">
    <!-- Loading State / Skeleton -->
    <div v-if="pending" class="max-w-4xl mx-auto animate-pulse">
      <div class="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg mb-8" />
      <div class="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-4" />
      <div class="h-10 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-6" />
      <div class="space-y-3">
        <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full" />
        <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-11/12" />
        <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-10/12" />
        <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-9/12" />
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 dark:border dark:border-red-800/50 p-4 rounded-lg max-w-4xl mx-auto">
      <div class="flex">
        <div class="flex-shrink-0">
          <i-heroicons-x-circle class="h-5 w-5 text-red-400" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800 dark:text-red-300">
            {{ $t('blog.postNotFound') }}
          </h3>
        </div>
      </div>
    </div>

    <!-- Post Content -->
    <article v-else-if="post" class="mx-auto w-full max-w-3xl">
      <!-- Admin Actions Bar -->
      <div v-if="isAdmin" class="mb-4 flex justify-center sm:justify-end gap-2">
        <NuxtLink
          :to="`/admin/blog/${post.id}/edit`"
          class="inline-flex items-center px-4 py-2 border border-indigo-500/30 text-sm font-medium rounded-lg text-indigo-200 bg-indigo-500/20 hover:bg-indigo-500/30 transition-colors"
        >
          <i-heroicons-pencil class="mr-2 h-4 w-4" />
          編輯文章
        </NuxtLink>
        <button
          @click="handleDelete"
          class="inline-flex items-center px-4 py-2 border border-red-500/30 text-sm font-medium rounded-lg text-red-200 bg-red-500/20 hover:bg-red-500/30 transition-colors"
        >
          <i-heroicons-trash class="mr-2 h-4 w-4" />
          刪除文章
        </button>
      </div>

      <!-- Breadcrumb -->
      <nav class="mb-6 text-sm">
        <ol class="flex items-center space-x-2 text-gray-500 dark:text-gray-500">
          <li>
            <NuxtLink to="/" class="hover:text-gray-700 dark:hover:text-gray-400 transition-colors">
              {{ $t('common.appName') }}
            </NuxtLink>
          </li>
          <li class="text-gray-400 dark:text-gray-700">/</li>
          <li>
            <NuxtLink to="/blog" class="hover:text-gray-700 dark:hover:text-gray-400 transition-colors">
              {{ $t('blog.title') }}
            </NuxtLink>
          </li>
          <li class="text-gray-400 dark:text-gray-700">/</li>
          <li class="text-gray-900 dark:text-gray-200 font-medium truncate max-w-[200px]">
            {{ post.title }}
          </li>
        </ol>
      </nav>

      <!-- Cover Image -->
      <div v-if="post.coverImage" class="mb-8 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700/50 bg-gray-100 dark:bg-gray-800">
        <NuxtImg
          :src="post.coverImage"
          :alt="post.title"
          width="1200"
          height="675"
          format="webp"
          loading="eager"
          class="w-full object-cover max-h-[500px]"
        />
      </div>

      <!-- Header -->
      <!-- Mobile-first header -->
      <header class="mb-6">
        <!-- Category Badge -->
        <div class="mb-4">
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30"
          >
            {{ $t(`blog.categories.${categoryKey}`) || post.category }}
          </span>
        </div>

        <!-- Title -->
        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 leading-snug">
          {{ post.title }}
        </h1>

        <!-- Meta Info -->
        <PostMeta
          :author="post.author.name || post.author.email"
          :date="post.publishedAt!"
          :reading-time="readingTime"
        />

        <!-- Tags -->
        <div v-if="parsedTags.length > 0" class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="tag in parsedTags"
            :key="tag"
            class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 dark:bg-gray-800/80 dark:text-gray-300 dark:border dark:border-gray-700/50"
          >
            #{{ tag }}
          </span>
        </div>
      </header>

      <!-- Content -->
      <div class="bg-gray-900/60 border border-gray-800 rounded-xl p-4 sm:p-6 mb-6">
        <div class="prose prose-lg prose-gray dark:prose-invert max-w-none
          prose-headings:text-gray-900 dark:prose-headings:text-gray-100
          prose-p:text-gray-700 dark:prose-p:text-gray-300
          prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-900 dark:prose-strong:text-gray-100
          prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-['']
          prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950
          prose-li:text-gray-700 dark:prose-li:text-gray-300
          prose-blockquote:border-indigo-500 dark:prose-blockquote:border-indigo-400
          prose-hr:border-gray-200 dark:prose-hr:border-gray-700
          prose-img:rounded-lg prose-img:shadow-md
          prose-table:text-gray-700 dark:prose-table:text-gray-300
        ">
          <MDC :value="post.content" />
        </div>
      </div>

      <!-- Share Section -->
      <div class="bg-gray-900/60 border border-gray-800 rounded-xl p-4 sm:p-6 mb-6">
        <h3 class="text-lg font-semibold text-gray-100 mb-4">
          {{ $t('blog.share') }}
        </h3>
        <div class="flex items-center gap-4 flex-wrap">
          <button
            @click="copyLink"
            class="inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-lg text-gray-200 bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <i-heroicons-link class="mr-2 h-5 w-5" />
            {{ $t('blog.copyLink') }}
          </button>
          <span v-if="copied" class="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <i-heroicons-check-circle class="h-4 w-4" />
            {{ $t('blog.linkCopied') }}
          </span>
        </div>

        <!-- Google Translate -->
        <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <GoogleTranslate />
        </div>
      </div>

      <!-- Back Button -->
      <div class="flex justify-center items-center pb-6">
        <NuxtLink
          to="/blog"
          class="inline-flex items-center px-6 py-3 border border-indigo-500/30 text-sm font-medium rounded-lg text-indigo-200 bg-indigo-500/20 hover:bg-indigo-500/30 transition-colors"
        >
          <i-heroicons-arrow-left class="mr-2 h-5 w-5" />
          {{ $t('blog.backToList') }}
        </NuxtLink>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { calculateReadingTime, parseTags } from '~/lib/blog'
import { usePerformance } from '~/composables/usePerformance'

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
const { isAdmin } = useAuth()
const copied = ref(false)
const toast = useToast()
const router = useRouter()

// Fetch post
console.log('[Blog Page] route.params.slug =', route.params.slug)

const { data: post, pending, error } = await useAsyncData(`blog-${route.params.slug}`, () =>
  $fetch<Post>(`/api/blog/${route.params.slug}`)
)

// ✅ Web Vitals (Phase 1)
usePerformance()

// Calculate reading time
const readingTime = computed(() => {
  return post.value ? calculateReadingTime(post.value.content) : 0
})

// Parse tags
const parsedTags = computed(() => {
  return post.value ? parseTags(post.value.tags) : []
})

// Map category to translation key
const categoryKey = computed(() => {
  if (!post.value) return ''
  const categoryMap: Record<string, string> = {
    '基本面分析': 'fundamental',
    '技术面分析': 'technical',
    '市场观察': 'market',
    '投資策略': 'strategy',
    '投资策略': 'strategy',
    'Fundamental Analysis': 'fundamental',
    'Technical Analysis': 'technical',
    'Market Watch': 'market',
    'Investment Strategy': 'strategy',
  }
  return categoryMap[post.value.category] || post.value.category
})

// SEO
useHead(() => ({
  title: post.value ? `${post.value.title} - 投資教學` : '文章載入中',
  meta: post.value ? [
    { name: 'description', content: post.value.excerpt || t('blog.description') },
    { property: 'og:title', content: post.value.title },
    { property: 'og:description', content: post.value.excerpt || t('blog.description') },
    { property: 'og:type', content: 'article' },
    { property: 'og:image', content: post.value.coverImage || '' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] : []
}))

// Copy link function
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

// Delete post function
const handleDelete = async () => {
  if (!post.value) return
  if (!confirm(`確定要刪除文章「${post.value.title}」嗎？此操作無法復原。`)) return

  try {
    await $fetch(`/api/blog/${post.value.id}`, { method: 'DELETE' })
    toast.success('文章已刪除')
    router.push('/blog')
  } catch (error: any) {
    console.error('Failed to delete post:', error)
    toast.error(error.data?.statusMessage || '刪除失敗')
  }
}
</script>
