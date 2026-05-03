<template>
  <main class="fintech-blog min-h-screen" style="color: var(--color-text)">
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
                <span class="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur-sm" style="border-color: color-mix(in srgb, var(--color-info) 25%, transparent); background: color-mix(in srgb, var(--color-info) 8%, transparent); color: var(--color-info)">
                  <Icon name="heroicons:sparkles-20-solid" class="h-4 w-4" />
                  {{ $t('blog.insightAndAnalysis') }}
                </span>
                <span class="h-px w-12" style="background: var(--color-border)"></span>
                <span class="text-xs font-medium" style="color: var(--color-text-soft)">{{ $t('blog.editorialDesk') }}</span>
              </div>
              <h1 class="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style="color: var(--color-text)">
                {{ $t('blog.pageTitle') }}
              </h1>
              <p class="mt-6 max-w-2xl text-lg leading-relaxed" style="color: var(--color-text-muted)">
                {{ $t('blog.description') }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-4 lg:flex-nowrap">
              <div class="stats-card reveal-2 group">
                <div class="flex flex-col">
                  <span class="stats-label text-[10px] font-bold uppercase tracking-[0.2em] transition-colors" style="color: var(--color-text-soft)">
                    {{ $t('blog.categoriesLabel') }}
                  </span>
                  <span class="mt-1 text-3xl font-bold tabular-nums" style="color: var(--color-text)">
                    {{ categories.length - 1 }}
                  </span>
                </div>
                <div class="h-10 w-10 rounded-xl flex items-center justify-center" style="background: color-mix(in srgb, var(--color-info) 10%, transparent)">
                  <Icon name="heroicons:tag" class="h-5 w-5" style="color: var(--color-info)" />
                </div>
              </div>
              <div class="stats-card reveal-3 group">
                <div class="flex flex-col">
                  <span class="stats-label text-[10px] font-bold uppercase tracking-[0.2em] transition-colors" style="color: var(--color-text-soft)">
                    {{ $t('admin.pagination.showing') }}
                  </span>
                  <span class="mt-1 text-3xl font-bold tabular-nums" style="color: var(--color-text)">
                    {{ posts.length }}
                  </span>
                </div>
                <div class="h-10 w-10 rounded-xl flex items-center justify-center" style="background: color-mix(in srgb, var(--color-warning) 10%, transparent)">
                  <Icon name="heroicons:document-text" class="h-5 w-5" style="color: var(--color-warning)" />
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
                <label for="search" class="mb-3 block text-xs font-bold uppercase tracking-wider" style="color: var(--color-text-soft)">
                  {{ $t('common.search') }}
                </label>
                <div class="relative">
                  <input
                    id="search"
                    v-model="searchQuery"
                    type="text"
                    @input="handleSearchInput"
                    @keyup.enter="performSearch"
                    class="blog-search-input w-full rounded-2xl border py-3.5 pl-11 pr-4 text-sm placeholder:opacity-60 focus:outline-none focus:ring-4"
                    :placeholder="$t('blog.searchPlaceholder')"
                  />
                  <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Icon name="heroicons:magnifying-glass-20-solid" class="blog-search-icon h-5 w-5 transition-colors" />
                  </div>
                </div>
              </div>

              <div class="rounded-3xl border p-6" style="border-color: var(--color-border); background: var(--color-surface)">
                <h3 class="mb-4 text-xs font-bold uppercase tracking-wider" style="color: var(--color-text-soft)">
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
                class="skeleton-card animate-pulse rounded-3xl p-5" style="background: var(--color-surface)"
              >
                <div class="mb-4 aspect-[16/10] rounded-2xl" style="background: var(--color-surface-strong)" />
                <div class="mb-3 h-4 w-3/4 rounded-lg" style="background: var(--color-surface-strong)" />
                <div class="mb-6 h-4 w-1/2 rounded-lg" style="background: var(--color-surface-strong)" />
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 rounded-full" style="background: var(--color-surface-strong)" />
                  <div class="space-y-2">
                    <div class="h-3 w-24 rounded" style="background: var(--color-surface-strong)" />
                    <div class="h-3 w-16 rounded" style="background: var(--color-surface-strong)" />
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="error" class="rounded-3xl border p-8 text-center" style="border-color: color-mix(in srgb, var(--color-danger) 20%, transparent); background: color-mix(in srgb, var(--color-danger) 5%, transparent)">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style="background: color-mix(in srgb, var(--color-danger) 10%, transparent)">
                <Icon name="heroicons:exclamation-triangle-20-solid" class="h-8 w-8" style="color: var(--color-danger)" />
              </div>
              <h3 class="text-lg font-bold" style="color: var(--color-text)">
                {{ $t('blog.loadFailed') }}
              </h3>
              <p class="mt-2" style="color: var(--color-text-muted)">
                {{ $t('blog.loadFailedDescription') }}
              </p>
              <button
                class="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all"
                style="background: var(--color-primary)"
                type="button"
                @click="refresh()"
              >
                <Icon name="heroicons:arrow-path" class="h-4 w-4" />
                {{ $t('blog.retryLoad') }}
              </button>
            </div>

            <div v-else-if="posts.length === 0" class="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed px-4 py-16 text-center" style="border-color: var(--color-border); background: var(--color-surface)">
              <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full" style="background: var(--color-surface-strong); box-shadow: var(--shadow-sm)">
                <Icon name="heroicons:document-magnifying-glass" class="h-10 w-10" style="color: var(--color-text-soft)" />
              </div>
              <h3 class="text-xl font-bold" style="color: var(--color-text)">
                {{ $t('blog.noPosts') }}
              </h3>
              <p class="mt-2 max-w-xs" style="color: var(--color-text-muted)">
                {{ $t('blog.noPostsDescription') }}
              </p>
              <button
                v-if="searchQuery"
                @click="searchQuery = ''; performSearch()"
                class="mt-6 text-sm font-bold" style="color: var(--color-secondary)"
              >
                {{ $t('blog.clearSearch') }}
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
              <div v-if="loadingMore" class="flex items-center gap-3 rounded-2xl px-6 py-3 text-sm font-bold" style="background: var(--color-surface); box-shadow: var(--shadow-md)" role="status" aria-live="polite">
                <span class="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style="border-color: var(--color-secondary); border-top-color: transparent" aria-hidden="true"></span>
                <span style="color: var(--color-text)">{{ $t('blog.exploringMore') }}</span>
              </div>
              <div v-else-if="!hasMore && posts.length > 0" class="flex items-center gap-3" style="color: var(--color-text-soft)">
                <span class="h-px w-8" style="background: var(--color-border)"></span>
                <p class="text-xs font-bold uppercase tracking-widest">
                  {{ $t('blog.reachedEnd') }}
                </p>
                <span class="h-px w-8" style="background: var(--color-border)"></span>
              </div>
            </div>

            <!-- Pagination (Fallback) -->
            <div v-if="pagination && pagination.totalPages > 1 && !enableInfiniteScroll" class="mt-16 flex justify-center">
              <nav class="flex items-center gap-2 rounded-2xl p-2" style="background: var(--color-surface); box-shadow: var(--shadow-sm)">
                <button
                  :disabled="pagination.page <= 1"
                  class="pagination-btn flex h-10 w-10 items-center justify-center rounded-xl transition-colors disabled:opacity-30"
                  @click="goToPage(pagination.page - 1)"
                >
                  <Icon name="heroicons:chevron-left" class="h-5 w-5" />
                </button>

                <div class="flex items-center gap-1 px-4 text-sm font-bold">
                  <span style="color: var(--color-text)">{{ pagination.page }}</span>
                  <span style="color: var(--color-text-soft)">/</span>
                  <span style="color: var(--color-text-soft)">{{ pagination.totalPages }}</span>
                </div>

                <button
                  :disabled="pagination.page >= pagination.totalPages"
                  class="pagination-btn flex h-10 w-10 items-center justify-center rounded-xl transition-colors disabled:opacity-30"
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
        class="mobile-fab mobile-fab-primary group"
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
        class="fixed inset-0 z-50 flex items-end justify-center backdrop-blur-sm lg:hidden"
        style="background: color-mix(in srgb, var(--color-background) 60%, black)"
        @click.self="toggleMobileFilters"
      >
        <Transition name="slide-up">
          <div class="w-full rounded-t-[2.5rem] p-8" style="background: var(--color-surface); box-shadow: var(--shadow-lg)">
            <div class="mb-8 flex items-center justify-between">
              <div>
                <h3 class="text-xl font-bold" style="color: var(--color-text)">{{ $t('blog.filterAndSearch') }}</h3>
                <p class="mt-1 text-sm" style="color: var(--color-text-soft)">{{ $t('blog.findTopics') }}</p>
              </div>
              <button
                type="button"
                class="flex h-10 w-10 items-center justify-center rounded-full" style="background: var(--color-surface-strong); color: var(--color-text-soft)"
                @click="toggleMobileFilters"
              >
                <Icon name="heroicons:x-mark" class="h-6 w-6" />
              </button>
            </div>

            <div class="space-y-8">
              <div class="space-y-3">
                <label for="mobile-search" class="text-xs font-bold uppercase tracking-widest" style="color: var(--color-text-soft)">
                  {{ $t('common.search') }}
                </label>
                <div class="relative">
                  <input
                    id="mobile-search"
                    v-model="searchQuery"
                    type="text"
                    @input="handleSearchInput"
                    @keyup.enter="performSearch"
                    class="blog-search-input w-full rounded-2xl border-none py-4 pl-12 pr-4 focus:ring-2"
                    :placeholder="$t('blog.searchPlaceholder')"
                  />
                  <Icon name="heroicons:magnifying-glass" class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" style="color: var(--color-text-soft)" />
                </div>
              </div>

              <div class="space-y-3 pb-8">
                <label class="text-xs font-bold uppercase tracking-widest" style="color: var(--color-text-soft)">
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
import { resolveErrorMessage } from '~/composables/useErrorI18n'

// Blog is a public page
definePageMeta({
  requiresAuth: false
})

// SEO
const { t } = useI18n()
const toast = useToast()
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

// Structured data — will be populated after posts are fetched
const { injectBreadcrumbSchema } = useStructuredData()
injectBreadcrumbSchema([
  { name: t('nav.home'), url: '/' },
  { name: t('blog.pageTitle') },
])

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
    toast.error(resolveErrorMessage(err, t))
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
.fintech-blog {
  background-color: var(--color-background);
}

.bg-grid {
  background-image: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0);
  background-size: 40px 40px;
  color: var(--color-border);
  opacity: 0.3;
}

.orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(80px);
  pointer-events: none;
  opacity: 0.25;
}

.orb-cyan {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, color-mix(in srgb, var(--color-info) 25%, transparent) 0%, transparent 70%);
  top: -100px;
  right: -50px;
}

.orb-amber {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, color-mix(in srgb, var(--color-secondary) 18%, transparent) 0%, transparent 70%);
  bottom: 10%;
  left: -50px;
}

.stats-card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 1.5rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.group:hover .stats-label {
  color: var(--color-secondary);
}

.blog-search-input {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
}
.blog-search-input::placeholder {
  color: var(--color-text-soft);
}
.blog-search-input:focus {
  border-color: var(--color-secondary);
  background: var(--color-surface);
  --tw-ring-color: color-mix(in srgb, var(--color-secondary) 12%, transparent);
}

.blog-search-icon {
  color: var(--color-text-soft);
}
.group:focus-within .blog-search-icon {
  color: var(--color-secondary);
}

.pagination-btn:hover:not(:disabled) {
  background: var(--color-surface-strong);
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
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-md);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mobile-fab-primary {
  background: var(--color-primary);
  color: #fff;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
</style>
