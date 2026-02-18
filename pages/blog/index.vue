<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {{ $t('blog.title') }}
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        {{ $t('blog.description') }}
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <!-- Sidebar -->
      <aside class="lg:col-span-1">
        <div class="bg-white dark:bg-gray-900/50 dark:border dark:border-gray-700/50 rounded-lg shadow-sm dark:shadow-none p-6 sticky top-4">
          <!-- Search -->
          <div class="mb-6">
            <label for="search" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ $t('common.search') }}
            </label>
            <div class="relative">
              <input
                type="text"
                id="search"
                v-model="searchQuery"
                @keyup.enter="performSearch"
                class="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800/80 dark:text-gray-100 dark:placeholder-gray-500 transition-all"
                :placeholder="$t('blog.searchPlaceholder')"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i-heroicons-magnifying-glass class="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
          </div>

          <!-- Category Filter -->
          <CategoryFilter :categories="categories" />

          <!-- Google Translate -->
          <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <GoogleTranslate />
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="lg:col-span-3">
        <!-- Loading State / Skeleton -->
        <div v-if="pending" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="i in 6"
            :key="i"
            class="bg-white dark:bg-gray-900/50 dark:border dark:border-gray-700/50 rounded-lg shadow-sm dark:shadow-none p-6 animate-pulse"
          >
            <div class="aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg mb-4" />
            <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2" />
            <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-4" />
            <div class="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2" />
            <div class="h-3 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 dark:border dark:border-red-800/50 p-4 rounded-lg">
          <div class="flex">
            <div class="flex-shrink-0">
              <i-heroicons-x-circle class="h-5 w-5 text-red-400" />
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800 dark:text-red-300">
                {{ $t('blog.loadFailed') }}
              </h3>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="posts.length === 0" class="text-center py-16 bg-white dark:bg-gray-900/50 dark:border dark:border-gray-700/50 rounded-lg shadow-sm dark:shadow-none">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <i-heroicons-document-text class="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ $t('blog.noPosts') }}
          </h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ $t('blog.noPostsDescription') }}
          </p>
        </div>

        <!-- Blog Posts Grid -->
        <div v-else class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <BlogCard
            v-for="post in posts"
            :key="post.id"
            :post="post"
          />
        </div>

        <!-- Pagination -->
        <div v-if="pagination && pagination.totalPages > 1" class="mt-8 flex justify-center">
          <nav class="flex items-center space-x-2">
            <button
              @click="goToPage(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ $t('admin.pagination.previous') }}
            </button>

            <span class="text-sm text-gray-700 dark:text-gray-400 px-2">
              {{ $t('admin.pagination.showing') }} {{ pagination.page }} {{ $t('admin.pagination.to') }} {{ pagination.totalPages }}
            </span>

            <button
              @click="goToPage(pagination.page + 1)"
              :disabled="pagination.page >= pagination.totalPages"
              class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ $t('admin.pagination.next') }}
            </button>
          </nav>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
// SEO
useHead({
  title: '投資教學 - 投資日記',
  meta: [
    { name: 'description', content: '專業投資知識分享，包括基本面分析、技術面分析、市場觀察和投資策略' }
  ]
})

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
const searchQuery = ref('')

// Build query params
const buildQueryParams = (page = 1) => {
  const params: Record<string, string | number> = {
    page,
    limit: 9
  }

  if (route.query.category) {
    params.category = route.query.category as string
  }

  if (searchQuery.value) {
    params.search = searchQuery.value
  }

  return params
}

// Fetch posts
const { data, pending, error, refresh } = await useLazyFetch('/api/blog', {
  params: buildQueryParams(),
  transform: (res: any) => res
})

const posts = computed(() => data.value?.data || [])
const pagination = computed(() => data.value?.pagination)

// Categories for filter - using i18n for labels, but keep actual values for API
const { t, locale } = useI18n()
const categories = computed(() => {
  // Map category keys to their actual values in different languages
  const categoryValues: Record<string, Record<string, string>> = {
    fundamental: {
      en: 'Fundamental Analysis',
      'zh-TW': '基本面分析',
      'zh-CN': '基本面分析'
    },
    technical: {
      en: 'Technical Analysis',
      'zh-TW': '技术面分析',
      'zh-CN': '技术面分析'
    },
    market: {
      en: 'Market Watch',
      'zh-TW': '市场观察',
      'zh-CN': '市场观察'
    },
    strategy: {
      en: 'Investment Strategy',
      'zh-TW': '投資策略',
      'zh-CN': '投资策略'
    }
  }

  return [
    { key: '', value: '', label: t('blog.allCategories') },
    { key: 'fundamental', value: categoryValues.fundamental[locale.value] || categoryValues.fundamental['zh-TW'], label: t('blog.categories.fundamental') },
    { key: 'technical', value: categoryValues.technical[locale.value] || categoryValues.technical['zh-TW'], label: t('blog.categories.technical') },
    { key: 'market', value: categoryValues.market[locale.value] || categoryValues.market['zh-TW'], label: t('blog.categories.market') },
    { key: 'strategy', value: categoryValues.strategy[locale.value] || categoryValues.strategy['zh-TW'], label: t('blog.categories.strategy') },
  ]
})

// Search handler
const performSearch = () => {
  refresh()
}

// Pagination
const goToPage = (page: number) => {
  if (page < 1 || page > (pagination.value?.totalPages || 1)) return

  // Update URL and refresh
  const query: Record<string, string> = { ...route.query, page: page.toString() }
  if (searchQuery.value) query.search = searchQuery.value

  navigateTo({ query })
}
</script>
