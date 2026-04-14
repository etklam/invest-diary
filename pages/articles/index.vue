<template>
  <main class="min-h-screen pb-24">
    <!-- Header -->
    <header class="max-w-content mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-1">
        <h1 class="text-3xl font-semibold tracking-tight text-copy">
          {{ $t('blog.pageTitle') }}
        </h1>
        <p class="text-copy-secondary text-sm max-w-xl">
          {{ $t('blog.description') }}
        </p>
      </div>

      <div class="flex items-center gap-3 text-xs font-semibold text-copy-muted uppercase tracking-widest">
        <span>{{ categories.length - 1 }} {{ $t('blog.categoriesLabel') }}</span>
        <span class="w-px h-4 bg-line" />
        <span>{{ posts.length }} {{ $t('admin.pagination.showing') }}</span>
      </div>
    </header>

    <!-- Main Content -->
    <div class="max-w-content mx-auto grid grid-cols-1 gap-10 lg:grid-cols-[220px_1fr]">
      <!-- Sidebar -->
      <aside v-if="!isMobile" class="lg:block">
        <div class="sticky top-24 space-y-8">
          <div>
            <BaseInput
              v-model="searchQuery"
              type="text"
              :label="$t('common.search')"
              :placeholder="$t('blog.searchPlaceholder')"
              @input="handleSearchInput"
              @keyup.enter="performSearch"
            />
          </div>

          <div>
            <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-copy-muted">
              {{ $t('blog.categoriesLabel') }}
            </p>
            <CategoryFilter :categories="categories" />
          </div>
        </div>
      </aside>

      <!-- Article Grid -->
      <div>
        <!-- Loading State -->
        <div v-if="pending" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <BaseSkeleton v-for="i in 6" :key="i" variant="card" />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="mb-12">
          <BaseAlert variant="error">
            <h3 class="font-semibold">{{ $t('blog.loadFailed') }}</h3>
            <p class="mt-1 opacity-90">{{ $t('blog.loadFailedDescription') }}</p>
            <div class="mt-4">
              <BaseButton variant="secondary" size="sm" @click="refresh()">
                <Icon name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
                {{ $t('blog.retryLoad') }}
              </BaseButton>
            </div>
          </BaseAlert>
        </div>

        <!-- Empty State -->
        <div v-else-if="posts.length === 0" class="py-24 text-center border border-dashed border-line">
          <div class="mb-6 flex justify-center">
            <Icon name="lucide:file-search" class="h-12 w-12 text-copy-muted opacity-20" />
          </div>
          <h3 class="text-xl font-semibold text-copy">{{ $t('blog.noPosts') }}</h3>
          <p class="mt-2 text-copy-secondary max-w-xs mx-auto text-sm">{{ $t('blog.noPostsDescription') }}</p>
          <div v-if="searchQuery" class="mt-8">
            <BaseButton variant="ghost" size="sm" @click="searchQuery = ''; performSearch()">
              {{ $t('blog.clearSearch') }}
            </BaseButton>
          </div>
        </div>

        <!-- Article Grid -->
        <div v-else class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <BlogCard
            v-for="post in posts"
            :key="post.id"
            :post="post"
          />
        </div>

        <!-- Load More (Infinite Scroll) -->
        <div v-if="enableInfiniteScroll" class="mt-12 flex flex-col items-center gap-4">
          <div ref="loadMoreTrigger" class="h-4 w-full" aria-hidden="true" />
          <div v-if="loadingMore" class="py-4">
            <BaseSkeleton variant="text" :count="2" width="200px" />
          </div>
          <div v-else-if="!hasMore && posts.length > 0" class="flex items-center gap-3">
            <span class="h-px w-8 bg-line" />
            <p class="text-xs font-semibold uppercase tracking-widest text-copy-muted">
              {{ $t('blog.reachedEnd') }}
            </p>
            <span class="h-px w-8 bg-line" />
          </div>
        </div>

        <!-- Pagination (Fallback) -->
        <div v-if="pagination && pagination.totalPages > 1 && !enableInfiniteScroll" class="mt-12 flex items-center justify-center gap-2">
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="pagination.page <= 1"
            @click="goToPage(pagination.page - 1)"
          >
            <Icon name="lucide:chevron-left" class="h-4 w-4" />
          </BaseButton>
          <span class="text-sm text-copy-secondary px-4">
            {{ pagination.page }} / {{ pagination.totalPages }}
          </span>
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="goToPage(pagination.page + 1)"
          >
            <Icon name="lucide:chevron-right" class="h-4 w-4" />
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Mobile Filter Button -->
    <div v-if="isMobile" class="fixed bottom-8 right-6 z-40">
      <BaseButton
        variant="primary"
        size="md"
        @click="toggleMobileFilters"
        aria-label="切換篩選"
      >
        <Icon name="lucide:sliders-horizontal" class="h-5 w-5" />
      </BaseButton>
    </div>

    <!-- Mobile Filter Sheet -->
    <Transition name="fade">
      <div
        v-if="isMobile && showMobileFilters"
        class="fixed inset-0 z-50 flex items-end justify-center bg-copy/40"
        @click.self="toggleMobileFilters"
      >
        <Transition name="slide-up">
          <div class="w-full bg-surface border-t border-line p-8 pb-safe">
            <div class="mb-8 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-copy">{{ $t('blog.filterAndSearch') }}</h3>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center text-copy-muted hover:text-copy transition-colors"
                @click="toggleMobileFilters"
              >
                <Icon name="lucide:x" class="h-5 w-5" />
              </button>
            </div>

            <div class="space-y-6 pb-8">
              <BaseInput
                v-model="searchQuery"
                type="text"
                :label="$t('common.search')"
                :placeholder="$t('blog.searchPlaceholder')"
                @input="handleSearchInput"
                @keyup.enter="performSearch"
              />

              <div>
                <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-copy-muted">
                  {{ $t('blog.categoriesLabel') }}
                </p>
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

// Categories for filter
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

const toggleMobileFilters = () => {
  showMobileFilters.value = !showMobileFilters.value
}

await loadInitial()
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity var(--duration-standard) ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active { transition: transform var(--duration-standard) ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
</style>
