<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {{ $t('blog.title') }}
      </h1>
      <p class="text-gray-600 dark:text-gray-300">
        {{ $t('blog.description') }}
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <!-- Sidebar -->
      <aside class="lg:col-span-1">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-4">
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
                class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                :placeholder="$t('blog.searchPlaceholder')"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i-heroicons-magnifying-glass class="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <!-- Category Filter -->
          <CategoryFilter :categories="categories" />
        </div>
      </aside>

      <!-- Main Content -->
      <main class="lg:col-span-3">
        <!-- Loading State / Skeleton -->
        <div v-if="pending" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="i in 6"
            :key="i"
            class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse"
          >
            <div class="aspect-video bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-50 dark:bg-red-900/50 p-4 rounded-md">
          <div class="flex">
            <div class="flex-shrink-0">
              <i-heroicons-x-circle class="h-5 w-5 text-red-400" />
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800 dark:text-red-100">
                {{ $t('blog.loadFailed') }}
              </h3>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="posts.length === 0" class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <i-heroicons-document-text class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {{ $t('blog.noPosts') }}
          </h3>
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
              class="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ $t('admin.pagination.previous') }}
            </button>

            <span class="text-sm text-gray-700 dark:text-gray-300">
              {{ $t('admin.pagination.showing') }} {{ pagination.page }} {{ $t('admin.pagination.to') }} {{ pagination.totalPages }}
            </span>

            <button
              @click="goToPage(pagination.page + 1)"
              :disabled="pagination.page >= pagination.totalPages"
              class="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

// Categories for filter
const categories = computed(() => [
  { key: '', value: '', label: '全部分類' },
  { key: 'fundamental', value: '基本面分析', label: '基本面分析' },
  { key: 'technical', value: '技术面分析', label: '技術面分析' },
  { key: 'market', value: '市场观察', label: '市場觀察' },
  { key: 'strategy', value: '投资策略', label: '投資策略' },
])

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
