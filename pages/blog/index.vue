<template>
  <main class="fintech-blog min-h-screen text-slate-900 dark:text-slate-100">
    <section class="relative overflow-hidden px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
      <div class="bg-grid absolute inset-0 opacity-35" aria-hidden="true" />
      <div class="orb orb-cyan" aria-hidden="true" />
      <div class="orb orb-amber" aria-hidden="true" />

      <div class="relative mx-auto max-w-7xl">
        <header class="hero-shell reveal rounded-3xl p-6 sm:p-8 lg:p-10">
          <div class="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <p class="inline-flex items-center gap-2 rounded-full border border-sky-300/50 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 backdrop-blur dark:border-sky-600/60 dark:bg-slate-900/80 dark:text-sky-200">
                <Icon name="heroicons:newspaper-20-solid" class="h-4 w-4" />
                Fintech Editorial Desk
              </p>
              <h1 class="mt-4 text-3xl font-semibold leading-tight text-slate-950 dark:text-slate-100 sm:text-4xl lg:text-5xl">
                {{ $t('blog.pageTitle') }}
              </h1>
              <p class="mt-4 max-w-3xl text-base leading-relaxed text-slate-700 dark:text-slate-300 sm:text-lg">
                {{ $t('blog.description') }}
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div class="metric-card reveal reveal-2">
                <p class="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {{ $t('blog.categoriesLabel') }}
                </p>
                <p class="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {{ categories.length - 1 }}
                </p>
              </div>
              <div class="metric-card reveal reveal-3">
                <p class="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {{ $t('admin.pagination.showing') }}
                </p>
                <p class="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {{ posts.length }}
                </p>
              </div>
            </div>
          </div>
        </header>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6">
      <div class="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-12">
        <aside class="lg:col-span-3">
          <div class="sidebar-shell sticky top-4 rounded-2xl p-5">
            <div class="mb-6">
              <label for="search" class="mb-2 block text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-300">
                {{ $t('common.search') }}
              </label>
              <div class="relative">
                <input
                  id="search"
                  v-model="searchQuery"
                  type="text"
                  @input="handleSearchInput"
                  @keyup.enter="performSearch"
                  class="search-input w-full rounded-xl border border-slate-200/80 bg-white/85 py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                  :placeholder="$t('blog.searchPlaceholder')"
                />
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Icon name="heroicons:magnifying-glass-20-solid" class="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </div>
              </div>
            </div>

            <CategoryFilter :categories="categories" />
          </div>
        </aside>

        <div class="lg:col-span-9">
          <div v-if="pending" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="i in 6"
              :key="i"
              class="skeleton-card animate-pulse rounded-2xl p-6"
            >
              <div class="mb-4 aspect-video rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
              <div class="mb-2 h-4 w-3/4 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              <div class="mb-4 h-4 w-1/2 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              <div class="mb-2 h-3 w-full rounded bg-slate-200/70 dark:bg-slate-800/70" />
              <div class="h-3 w-5/6 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
          </div>

          <div v-else-if="error" class="rounded-2xl border border-red-300/70 bg-red-50/90 p-4 text-red-900 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300">
            <div class="flex items-start gap-3">
              <Icon name="heroicons:x-circle-20-solid" class="h-5 w-5" />
              <div>
                <h3 class="text-sm font-medium">
                  {{ $t('blog.loadFailed') }}
                </h3>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button class="pager-btn cursor-pointer rounded-lg px-4 py-2 text-sm font-medium" type="button" @click="refresh()">
                    {{ $t('blog.retryLoad') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="posts.length === 0" class="empty-shell rounded-2xl py-16 text-center">
            <div class="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-slate-200/80 bg-white/85 dark:border-slate-700/80 dark:bg-slate-900/80">
              <Icon name="heroicons:document-text-20-solid" class="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 class="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              {{ $t('blog.noPosts') }}
            </h3>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {{ $t('blog.noPostsDescription') }}
            </p>
          </div>

          <div v-else class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <BlogCard
              v-for="post in posts"
              :key="post.id"
              :post="post"
            />
          </div>

          <div v-if="pagination && pagination.totalPages > 1" class="mt-10 flex justify-center">
            <nav class="pager-shell flex items-center gap-2 rounded-xl px-3 py-2">
              <button
                :disabled="pagination.page <= 1"
                class="pager-btn cursor-pointer rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                :aria-label="$t('blog.previousPage')"
                @click="goToPage(pagination.page - 1)"
              >
                {{ $t('admin.pagination.previous') }}
              </button>

              <span class="px-2 text-sm text-slate-700 dark:text-slate-300">
                {{ $t('blog.pageIndicator', { page: pagination.page, totalPages: pagination.totalPages }) }}
              </span>

              <button
                :disabled="pagination.page >= pagination.totalPages"
                class="pager-btn cursor-pointer rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                :aria-label="$t('blog.nextPage')"
                @click="goToPage(pagination.page + 1)"
              >
                {{ $t('admin.pagination.next') }}
              </button>
            </nav>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
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
const canonicalUrl = `${siteUrl}/blog`
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

// Fetch posts
const { data, pending, error, refresh } = await useLazyFetch('/api/blog', {
  params: () => buildQueryParams(Number(route.query.page || 1)),
  watch: [() => route.query.category, () => route.query.page, () => route.query.search],
  transform: (res: any) => res
})

const posts = computed(() => data.value?.data || [])
const pagination = computed(() => data.value?.pagination)

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
  }, 300)
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
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

.fintech-blog {
  font-family: 'IBM Plex Sans', 'Avenir Next', 'Segoe UI', sans-serif;
  background:
    radial-gradient(1200px 700px at 12% -10%, rgb(56 189 248 / 18%), transparent 58%),
    radial-gradient(1100px 620px at 95% -5%, rgb(245 158 11 / 14%), transparent 62%),
    rgb(240 249 255);
}

:global(.dark .fintech-blog),
:global(.dark-mode .fintech-blog) {
  background:
    radial-gradient(1100px 640px at 10% -10%, rgb(56 189 248 / 10%), transparent 58%),
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
  width: 280px;
  height: 280px;
  background: rgb(56 189 248 / 28%);
  top: 26px;
  right: 12%;
}

.orb-amber {
  width: 230px;
  height: 230px;
  background: rgb(245 158 11 / 24%);
  bottom: 20px;
  left: 10%;
}

.hero-shell,
.sidebar-shell,
.empty-shell,
.pager-shell,
.metric-card,
.skeleton-card {
  border: 1px solid rgb(186 230 253 / 80%);
  background: rgb(255 255 255 / 82%);
  backdrop-filter: blur(9px);
}

.metric-card {
  padding: 1rem;
}

:global(.dark .hero-shell),
:global(.dark .sidebar-shell),
:global(.dark .empty-shell),
:global(.dark .pager-shell),
:global(.dark .metric-card),
:global(.dark .skeleton-card),
:global(.dark-mode .hero-shell),
:global(.dark-mode .sidebar-shell),
:global(.dark-mode .empty-shell),
:global(.dark-mode .pager-shell),
:global(.dark-mode .metric-card),
:global(.dark-mode .skeleton-card) {
  border-color: rgb(71 85 105);
  background: rgb(10 16 30 / 86%);
}

.pager-btn {
  border: 1px solid rgb(14 165 233 / 30%);
  color: rgb(12 74 110);
  background: rgb(224 242 254 / 60%);
  transition: all 200ms ease;
  outline: none;
}

.pager-btn:focus-visible {
  box-shadow: 0 0 0 2px rgb(14 165 233 / 35%);
}

.pager-btn:hover {
  border-color: rgb(14 165 233 / 55%);
  background: rgb(224 242 254 / 85%);
}

:global(.dark .pager-btn),
:global(.dark-mode .pager-btn) {
  border-color: rgb(71 85 105);
  color: rgb(186 230 253);
  background: rgb(22 32 50 / 85%);
}

:global(.dark .pager-btn:hover),
:global(.dark-mode .pager-btn:hover) {
  border-color: rgb(56 189 248 / 70%);
  background: rgb(30 41 59);
}

.reveal {
  animation: reveal-up 700ms ease both;
}

.reveal-2 {
  animation-delay: 120ms;
}

.reveal-3 {
  animation-delay: 220ms;
}

@keyframes reveal-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal,
  .pager-btn {
    animation: none;
    transition: none;
  }
}
</style>
