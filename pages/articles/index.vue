<template>
  <main class="fintech-blog min-h-screen text-slate-900 dark:text-slate-100">
    <!-- Hero Section -->
    <section class="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:pb-24 lg:pt-24">
      <div class="bg-grid absolute inset-0 opacity-[0.15]" aria-hidden="true" />
      <div class="orb orb-cyan" aria-hidden="true" />
      <div class="orb orb-amber" aria-hidden="true" />

      <div class="relative mx-auto max-w-7xl">
        <header class="reveal rounded-3xl">
          <div class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div class="max-w-3xl">
              <div class="mb-6 flex items-center gap-3">
                <span class="inline-flex items-center gap-2 rounded-full border border-sky-200/50 bg-sky-50/50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-sky-700 backdrop-blur-sm dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
                  <Icon name="heroicons:sparkles-20-solid" class="h-4 w-4" />
                  {{ $t('blog.insightAndAnalysis') }}
                </span>
                <span class="h-px w-12 bg-slate-200 dark:bg-slate-700"></span>
                <span class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ $t('blog.editorialDesk') }}</span>
              </div>
              <h1 class="text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
                {{ $t('blog.pageTitle') }}
              </h1>
              <p class="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                {{ $t('blog.description') }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-4 lg:flex-nowrap">
              <div class="stats-card reveal-2 group">
                <div class="flex flex-col">
                  <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 group-hover:text-sky-500 dark:text-slate-500 transition-colors">
                    {{ $t('blog.categoriesLabel') }}
                  </span>
                  <span class="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {{ categories.length - 1 }}
                  </span>
                </div>
                <div class="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center dark:bg-sky-500/10">
                  <Icon name="heroicons:tag" class="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
              </div>
              <div class="stats-card reveal-3 group">
                <div class="flex flex-col">
                  <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 group-hover:text-amber-500 dark:text-slate-500 transition-colors">
                    {{ $t('admin.pagination.showing') }}
                  </span>
                  <span class="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {{ posts.length }}
                  </span>
                </div>
                <div class="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center dark:bg-amber-500/10">
                  <Icon name="heroicons:document-text" class="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>
    </section>

    <!-- Main Content -->
    <section class="px-4 pb-24 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <!-- Sidebar -->
          <aside v-if="!isMobile" class="lg:col-span-3">
            <div class="sticky top-24 space-y-8">
              <div class="group">
                <label for="search" class="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {{ $t('common.search') }}
                </label>
                <div class="relative">
                  <input
                    id="search"
                    v-model="searchQuery"
                    type="text"
                    @input="handleSearchInput"
                    @keyup.enter="performSearch"
                    class="search-input w-full rounded-2xl border border-slate-200 bg-white/50 py-3.5 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                    :placeholder="$t('blog.searchPlaceholder')"
                  />
                  <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Icon name="heroicons:magnifying-glass-20-solid" class="h-5 w-5 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                  </div>
                </div>
              </div>

              <div class="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/30">
                <h3 class="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {{ $t('blog.categoriesLabel') }}
                </h3>
                <CategoryFilter :categories="categories" />
              </div>
            </div>
          </aside>

          <!-- Article Grid -->
          <div class="lg:col-span-9">
            <div v-if="pending" class="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="i in 6"
                :key="i"
                class="skeleton-card animate-pulse rounded-3xl bg-white/40 p-5 dark:bg-slate-900/40"
              >
                <div class="mb-4 aspect-[16/10] rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
                <div class="mb-3 h-4 w-3/4 rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
                <div class="mb-6 h-4 w-1/2 rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 rounded-full bg-slate-200/60 dark:bg-slate-800/60" />
                  <div class="space-y-2">
                    <div class="h-3 w-24 rounded bg-slate-200/60 dark:bg-slate-800/60" />
                    <div class="h-3 w-16 rounded bg-slate-200/60 dark:bg-slate-800/60" />
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="error" class="rounded-3xl border border-red-100 bg-red-50/50 p-8 text-center dark:border-red-900/30 dark:bg-red-900/10">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100/50 dark:bg-red-900/30">
                <Icon name="heroicons:exclamation-triangle-20-solid" class="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 class="text-lg font-bold text-slate-950 dark:text-white">
                {{ $t('blog.loadFailed') }}
              </h3>
              <p class="mt-2 text-slate-600 dark:text-slate-400">
                我們在載入文章時遇到了一些問題，請稍後再試。
              </p>
              <button
                class="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                type="button"
                @click="refresh()"
              >
                <Icon name="heroicons:arrow-path" class="h-4 w-4" />
                {{ $t('blog.retryLoad') }}
              </button>
            </div>

            <div v-else-if="posts.length === 0" class="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-16 text-center dark:border-slate-800 dark:bg-slate-900/30">
              <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-800">
                <Icon name="heroicons:document-magnifying-glass" class="h-10 w-10 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 class="text-xl font-bold text-slate-950 dark:text-white">
                {{ $t('blog.noPosts') }}
              </h3>
              <p class="mt-2 max-w-xs text-slate-600 dark:text-slate-400">
                {{ $t('blog.noPostsDescription') }}
              </p>
              <button
                v-if="searchQuery"
                @click="searchQuery = ''; performSearch()"
                class="mt-6 text-sm font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400"
              >
                清除搜尋條件
              </button>
            </div>

            <div v-else class="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              <BlogCard
                v-for="(post, index) in posts"
                :key="post.id"
                :post="post"
                class="reveal"
                :style="{ animationDelay: `${index * 50}ms` }"
              />
            </div>

            <!-- Loading More -->
            <div
              v-if="enableInfiniteScroll"
              class="mt-16 flex flex-col items-center gap-6"
            >
              <div ref="loadMoreTrigger" class="h-4 w-full" aria-hidden="true" />
              <div v-if="loadingMore" class="flex items-center gap-3 rounded-2xl bg-white px-6 py-3 text-sm font-bold shadow-xl shadow-slate-200/50 dark:bg-slate-900 dark:shadow-none">
                <span class="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"></span>
                <span class="text-slate-700 dark:text-slate-200">{{ $t('blog.exploringMore') }}</span>
              </div>
              <div v-else-if="!hasMore && posts.length > 0" class="flex items-center gap-3 text-slate-400 dark:text-slate-600">
                <span class="h-px w-8 bg-slate-200 dark:bg-slate-800"></span>
                <p class="text-xs font-bold uppercase tracking-widest">
                  {{ $t('blog.reachedEnd') }}
                </p>
                <span class="h-px w-8 bg-slate-200 dark:bg-slate-800"></span>
              </div>
            </div>

            <!-- Pagination (Fallback) -->
            <div v-if="pagination && pagination.totalPages > 1 && !enableInfiniteScroll" class="mt-16 flex justify-center">
              <nav class="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm dark:bg-slate-900">
                <button
                  :disabled="pagination.page <= 1"
                  class="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                  @click="goToPage(pagination.page - 1)"
                >
                  <Icon name="heroicons:chevron-left" class="h-5 w-5" />
                </button>

                <div class="flex items-center gap-1 px-4 text-sm font-bold">
                  <span class="text-slate-900 dark:text-white">{{ pagination.page }}</span>
                  <span class="text-slate-400">/</span>
                  <span class="text-slate-400">{{ pagination.totalPages }}</span>
                </div>

                <button
                  :disabled="pagination.page >= pagination.totalPages"
                  class="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                  @click="goToPage(pagination.page + 1)"
                >
                  <Icon name="heroicons:chevron-right" class="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Mobile Controls -->
    <div v-if="isMobile" class="fixed bottom-8 right-6 z-40 flex flex-col gap-4">
      <button
        type="button"
        class="mobile-fab group"
        aria-label="回到頂部"
        @click="scrollToTop"
      >
        <Icon name="heroicons:chevron-up" class="h-6 w-6 transition-transform group-hover:-translate-y-1" />
      </button>
      <button
        type="button"
        class="mobile-fab bg-sky-600 !text-white group"
        aria-label="切換篩選"
        @click="toggleMobileFilters"
      >
        <Icon name="heroicons:adjustments-horizontal" class="h-6 w-6 transition-transform group-hover:scale-110" />
      </button>
    </div>

    <!-- Mobile Filter Modal -->
    <Transition name="fade">
      <div
        v-if="isMobile && showMobileFilters"
        class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 backdrop-blur-sm lg:hidden"
        @click.self="toggleMobileFilters"
      >
        <Transition name="slide-up">
          <div class="w-full rounded-t-[2.5rem] bg-white p-8 shadow-2xl dark:bg-slate-900">
            <div class="mb-8 flex items-center justify-between">
              <div>
                <h3 class="text-xl font-bold text-slate-950 dark:text-white">{{ $t('blog.filterAndSearch') }}</h3>
                <p class="mt-1 text-sm text-slate-500">{{ $t('blog.findTopics') }}</p>
              </div>
              <button
                type="button"
                class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800"
                @click="toggleMobileFilters"
              >
                <Icon name="heroicons:x-mark" class="h-6 w-6" />
              </button>
            </div>

            <div class="space-y-8">
              <div class="space-y-3">
                <label for="mobile-search" class="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {{ $t('common.search') }}
                </label>
                <div class="relative">
                  <input
                    id="mobile-search"
                    v-model="searchQuery"
                    type="text"
                    @input="handleSearchInput"
                    @keyup.enter="performSearch"
                    class="w-full rounded-2xl border-none bg-slate-100 py-4 pl-12 pr-4 text-slate-900 focus:ring-2 focus:ring-sky-500/20 dark:bg-slate-800 dark:text-white"
                    :placeholder="$t('blog.searchPlaceholder')"
                  />
                  <Icon name="heroicons:magnifying-glass" class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div class="space-y-3 pb-8">
                <label class="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {{ $t('blog.categoriesLabel') }}
                </label>
                <CategoryFilter :categories="categories" />
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useInfiniteScroll, useMediaQuery } from '@vueuse/core'
import { CATEGORY_OPTIONS } from '~/types/blog'
import type { LocationQueryValue } from 'vue-router'

// Blog is a public page
definePageMeta({
  requiresAuth: false
})

// SEO
const { t } = useI18n()
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl || 'https://trade-basic.com').replace(/\/+$/, '')
const canonicalUrl = `${siteUrl}/articles`
useHead(() => ({
  title: `${t('blog.pageTitle')} - ${t('common.appName')}`,
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    { name: 'description', content: t('blog.description') },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: `${t('blog.pageTitle')} - ${t('common.appName')}` },
    { property: 'og:description', content: t('blog.description') },
    { property: 'og:url', content: canonicalUrl },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: `${t('blog.pageTitle')} - ${t('common.appName')}` },
    { name: 'twitter:description', content: t('blog.description') }
  ]
}))

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
const getQueryValue = (value: LocationQueryValue | LocationQueryValue[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    const first = value[0]
    return typeof first === 'string' ? first : undefined
  }
  return typeof value === 'string' ? value : undefined
}

const searchQuery = ref(getQueryValue(route.query.search) || '')
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
const enableInfiniteScroll = ref(true)
const isMobile = useMediaQuery('(max-width: 768px)')
const showMobileFilters = ref(false)
const loadMoreTrigger = ref<HTMLElement | null>(null)
const loadingMore = ref(false)
const currentPage = ref(Number(route.query.page || 1))
const posts = ref<Post[]>([])
const pagination = ref<{ page: number; limit: number; total: number; totalPages: number } | null>(null)
const prefetchCache = new Map<number, any>()
const prefetching = new Set<number>()

// Build query params
const buildQueryParams = (page = 1) => {
  const params: Record<string, string | number> = {
    page,
    limit: 9
  }

  const category = getQueryValue(route.query.category)
  if (category) {
    params.category = category
  }

  const search = getQueryValue(route.query.search)
  if (search) {
    params.search = search
  }

  return params
}

const pending = ref(true)
const error = ref<any>(null)

const fetchPage = async (page: number) => {
  return await $fetch('/api/blog', {
    params: buildQueryParams(page)
  }) as any
}

const setPageData = (page: number, payload: any, append = false) => {
  if (!payload) return
  const nextPosts = payload.data || []
  if (append) {
    posts.value = [...posts.value, ...nextPosts]
  } else {
    posts.value = nextPosts
  }
  pagination.value = payload.pagination || null
  currentPage.value = page
}

const loadInitial = async () => {
  try {
    pending.value = true
    error.value = null
    prefetchCache.clear()
    const payload = await fetchPage(currentPage.value)
    setPageData(currentPage.value, payload, false)
    await prefetchNextPage()
  } catch (err: any) {
    console.error('Failed to fetch posts:', err)
    error.value = err
  } finally {
    pending.value = false
  }
}

const refresh = async () => {
  await loadInitial()
}

// Categories for filter - using unified English keys
const categories = computed(() => {
  return [
    { key: '', value: '', label: t('blog.allCategories') },
    ...CATEGORY_OPTIONS.map(cat => ({
      key: cat,
      value: cat,
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
  const keyword = searchQuery.value.trim()
  if (keyword) query.search = keyword
  else delete query.search
  query.page = '1'
  router.push({ query })
}

const handleSearchInput = () => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    performSearch()
  }, 400)
}

onBeforeUnmount(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
})

watch(
  () => getQueryValue(route.query.search),
  (querySearch) => {
    const nextValue = querySearch || ''
    if (nextValue !== searchQuery.value) {
      searchQuery.value = nextValue
    }
  }
)

watch(
  () => [route.query.category, route.query.search],
  () => {
    currentPage.value = 1
    loadInitial()
  }
)

// Pagination
const goToPage = (page: number) => {
  if (page < 1 || page > (pagination.value?.totalPages || 1)) return

  const query: Record<string, string> = {}
  Object.entries(route.query).forEach(([k, v]) => {
    if (typeof v === 'string') query[k] = v
  })
  query.page = page.toString()
  const keyword = searchQuery.value.trim()
  if (keyword) query.search = keyword
  else delete query.search

  navigateTo({ query })
}

const hasMore = computed(() => {
  if (!pagination.value) return false
  return currentPage.value < pagination.value.totalPages
})

const prefetchNextPage = async () => {
  if (!pagination.value) return
  const nextPage = currentPage.value + 1
  if (nextPage > pagination.value.totalPages) return
  if (prefetchCache.has(nextPage) || prefetching.has(nextPage)) return

  prefetching.add(nextPage)
  try {
    const payload = await fetchPage(nextPage)
    prefetchCache.set(nextPage, payload)
  } catch (err) {
    console.warn('Prefetch next page failed:', err)
  } finally {
    prefetching.delete(nextPage)
  }
}

const loadMore = async () => {
  if (!enableInfiniteScroll.value) return
  if (loadingMore.value || pending.value || !hasMore.value) return
  loadingMore.value = true
  const nextPage = currentPage.value + 1

  try {
    let payload = prefetchCache.get(nextPage)
    if (!payload) {
      payload = await fetchPage(nextPage)
    }
    setPageData(nextPage, payload, true)
    prefetchCache.delete(nextPage)
    await prefetchNextPage()
  } catch (err) {
    console.error('Failed to load more posts:', err)
  } finally {
    loadingMore.value = false
  }
}

if (process.client) {
  useInfiniteScroll(
    loadMoreTrigger,
    () => loadMore(),
    { distance: 400 }
  )
}

watch(
  () => pagination.value?.page,
  () => {
    prefetchNextPage()
  }
)

const scrollToTop = () => {
  if (!process.client) return
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const toggleMobileFilters = () => {
  showMobileFilters.value = !showMobileFilters.value
}

await loadInitial()
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.fintech-blog {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background-color: #f8fafc;
}

:global(.dark .fintech-blog) {
  background-color: #020617;
}

.bg-grid {
  background-image: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0);
  background-size: 40px 40px;
  color: rgb(15 23 42 / 0.05);
}

:global(.dark .bg-grid) {
  color: rgb(255 255 255 / 0.03);
}

.orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(80px);
  pointer-events: none;
  opacity: 0.5;
}

.orb-cyan {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, transparent 70%);
  top: -100px;
  right: -50px;
}

.orb-amber {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%);
  bottom: 10%;
  left: -50px;
}

.stats-card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  background: white;
  border: 1px solid #f1f5f9;
  border-radius: 1.5rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.02), 0 2px 4px -2px rgb(0 0 0 / 0.02);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.04), 0 4px 6px -4px rgb(0 0 0 / 0.04);
  border-color: #e2e8f0;
}

:global(.dark .stats-card) {
  background: #0f172a;
  border-color: #1e293b;
  box-shadow: none;
}

.reveal {
  animation: reveal-up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.reveal-2 { animation-delay: 0.1s; }
.reveal-3 { animation-delay: 0.2s; }

@keyframes reveal-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mobile-fab {
  display: flex;
  height: 3.5rem;
  width: 3.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: white;
  color: #1e293b;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:global(.dark .mobile-fab) {
  background: #1e293b;
  color: #f8fafc;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
</style>
