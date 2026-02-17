<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Loading State / Skeleton -->
    <div v-if="pending" class="max-w-4xl mx-auto animate-pulse">
      <div class="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-8" />
      <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-6" />
      <div class="space-y-3">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-11/12" />
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-10/12" />
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-9/12" />
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
      <div class="flex">
        <div class="flex-shrink-0">
          <i-heroicons-x-circle class="h-5 w-5 text-red-400" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
            {{ $t('blog.postNotFound') }}
          </h3>
        </div>
      </div>
    </div>

    <!-- Post Content -->
    <article v-else-if="post" class="max-w-4xl mx-auto">
      <!-- Admin Actions Bar -->
      <div v-if="isAdmin" class="mb-4 flex justify-end gap-2">
        <NuxtLink
          :to="`/admin/blog/${post.id}/edit`"
          class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800"
        >
          <i-heroicons-pencil class="mr-2 h-4 w-4" />
          編輯文章
        </NuxtLink>
        <button
          @click="handleDelete"
          class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
        >
          <i-heroicons-trash class="mr-2 h-4 w-4" />
          刪除文章
        </button>
      </div>

      <!-- Breadcrumb -->
      <nav class="mb-6 text-sm">
        <ol class="flex items-center space-x-2">
          <li>
            <NuxtLink to="/" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              {{ $t('common.appName') }}
            </NuxtLink>
          </li>
          <li class="text-gray-500">/</li>
          <li>
            <NuxtLink to="/blog" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              {{ $t('blog.title') }}
            </NuxtLink>
          </li>
          <li class="text-gray-500">/</li>
          <li class="text-gray-900 dark:text-gray-100 font-medium truncate">
            {{ post.title }}
          </li>
        </ol>
      </nav>

      <!-- Cover Image -->
      <div v-if="post.coverImage" class="mb-8 rounded-lg overflow-hidden">
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
      <header class="mb-8">
        <!-- Category Badge -->
        <div class="mb-4">
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
          >
            {{ $t(`blog.categories.${categoryKey}`) || post.category }}
          </span>
        </div>

        <!-- Title -->
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
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
            class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
          >
            #{{ tag }}
          </span>
        </div>
      </header>

      <!-- Content -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 mb-8">
        <div class="prose prose-lg dark:prose-invert max-w-none">
          <MDC :value="post.content" />
        </div>
      </div>

      <!-- Share Section -->
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {{ $t('blog.share') }}
        </h3>
        <div class="flex items-center gap-4">
          <button
            @click="copyLink"
            class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <i-heroicons-link class="mr-2 h-5 w-5" />
            {{ $t('blog.copyLink') }}
          </button>
          <span v-if="copied" class="text-sm text-green-600 dark:text-green-400">
            {{ $t('blog.linkCopied') }}
          </span>
        </div>
      </div>

      <!-- Back Button -->
      <div class="flex justify-center">
        <NuxtLink
          to="/blog"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800"
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
