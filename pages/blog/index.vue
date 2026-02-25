<template>
  <div class="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
      <div class="hero-orb mx-auto h-72 w-[90%] max-w-6xl rounded-full" />
    </div>

    <header class="relative mb-10 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8 dark:border-zinc-700/70 dark:bg-zinc-900/70">
      <div class="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div class="lg:col-span-8">
          <p class="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
            Diary Editorial
          </p>
          <h1 class="font-serif text-3xl font-semibold leading-tight text-zinc-950 sm:text-4xl dark:text-zinc-100">
            {{ $t('blog.title') }}
          </h1>
          <p class="mt-3 max-w-2xl text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
            {{ $t('blog.description') }}
          </p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:col-span-4">
          <div class="rounded-xl border border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/80">
            <p class="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {{ $t('blog.categoriesLabel') }}
            </p>
            <p class="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {{ categories.length - 1 }}
            </p>
          </div>
          <div class="rounded-xl border border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/80">
            <p class="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {{ $t('admin.pagination.showing') }}
            </p>
            <p class="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {{ posts.length }}
            </p>
          </div>
        </div>
      </div>
    </header>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <!-- Sidebar -->
      <aside class="lg:col-span-3">
        <div class="sticky top-4 rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:border-zinc-700/70 dark:bg-zinc-900/70">
          <!-- Search -->
          <div class="mb-6">
            <label for="search" class="mb-2 block text-sm font-semibold tracking-wide text-zinc-700 dark:text-zinc-300">
              {{ $t('common.search') }}
            </label>
            <div class="relative">
              <input
                type="text"
                id="search"
                v-model="searchQuery"
                @keyup.enter="performSearch"
                class="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-10 pr-4 text-sm text-zinc-800 transition-colors duration-200 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                :placeholder="$t('blog.searchPlaceholder')"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i-heroicons-magnifying-glass class="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
              </div>
            </div>
          </div>

          <!-- Category Filter -->
          <CategoryFilter :categories="categories" />
        </div>
      </aside>

      <!-- Main Content -->
      <main class="lg:col-span-9">
        <!-- Loading State / Skeleton -->
        <div v-if="pending" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="i in 6"
            :key="i"
            class="animate-pulse rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70"
          >
            <div class="mb-4 aspect-video rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            <div class="mb-2 h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div class="mb-4 h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div class="mb-2 h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
            <div class="h-3 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/20">
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
        <div v-else-if="posts.length === 0" class="rounded-2xl border border-zinc-200/80 bg-white/90 py-16 text-center shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900/70">
          <div class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <i-heroicons-document-text class="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 class="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {{ $t('blog.noPosts') }}
          </h3>
          <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
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
        <div v-if="pagination && pagination.totalPages > 1" class="mt-10 flex justify-center">
          <nav class="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
            <button
              @click="goToPage(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {{ $t('admin.pagination.previous') }}
            </button>

            <span class="px-2 text-sm text-zinc-700 dark:text-zinc-400">
              {{ $t('admin.pagination.showing') }} {{ pagination.page }} {{ $t('admin.pagination.to') }} {{ pagination.totalPages }}
            </span>

            <button
              @click="goToPage(pagination.page + 1)"
              :disabled="pagination.page >= pagination.totalPages"
              class="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
import { CATEGORY_OPTIONS } from '~/types/blog'

// Blog is a public page
definePageMeta({
  requiresAuth: false
})

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
const router = useRouter()
const searchQuery = ref((route.query.search as string) || '')

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
const { data, pending, error } = await useLazyFetch('/api/blog', {
  params: () => buildQueryParams(Number(route.query.page || 1)),
  watch: [() => route.query.category, () => route.query.page, () => route.query.search],
  transform: (res: any) => res
})

const posts = computed(() => data.value?.data || [])
const pagination = computed(() => data.value?.pagination)

// Categories for filter - using unified English keys
const { t } = useI18n()
const categories = computed(() => {
  return [
    { key: '', value: '', label: t('blog.allCategories') },
    ...CATEGORY_OPTIONS.map(cat => ({
      key: cat,
      value: cat, // 使用英文 key作為 API查詢值
      label: t(`blog.categories.${cat}`)
    }))
  ]
})

// Search handler
const performSearch = () => {
  const query: Record<string, string> = {}
  Object.entries(route.query).forEach(([k, v]) => {
    if (typeof v === 'string') query[k] = v
  })
  if (searchQuery.value) query.search = searchQuery.value
  else delete query.search
  query.page = '1'
  router.push({ query })
}

// Pagination
const goToPage = (page: number) => {
  if (page < 1 || page > (pagination.value?.totalPages || 1)) return

  const query: Record<string, string> = {}
  Object.entries(route.query).forEach(([k, v]) => {
    if (typeof v === 'string') query[k] = v
  })
  query.page = page.toString()
  if (searchQuery.value) query.search = searchQuery.value

  navigateTo({ query })
}
</script>

<style scoped>
.hero-orb {
  background:
    radial-gradient(circle at 15% 20%, rgba(37, 99, 235, 0.12), transparent 35%),
    radial-gradient(circle at 85% 10%, rgba(24, 24, 27, 0.08), transparent 30%),
    linear-gradient(180deg, rgba(250, 250, 250, 0.7), rgba(250, 250, 250, 0));
}
</style>
