<script setup lang="ts">
import {
  buildAdminBlogQueryString,
  getBlogStatusBadgeClass,
  getBlogStatusLabel,
  toggleSelectionId,
  toggleSelectAllIds,
} from '~/lib/admin/blog-management'
import { resolveReloadPageAfterDelete } from '~/lib/admin/user-management'
import { formatDate } from '~/lib/dates'
import { CATEGORY_OPTIONS } from '~/types/blog'

const { t } = useI18n()
const toast = useToast()

definePageMeta({
  middleware: 'admin',
  requiresAuth: true,
})

// State
const posts = ref<any[]>([])
const loading = ref(true)
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})
const filters = ref({
  status: '',
  category: '',
  search: '',
  author: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'createdAt_desc'
})
const selectedPosts = ref(new Set<string>())
const selectedCount = computed(() => selectedPosts.value.size)

// Categories - using unified English keys
const categories = computed(() => [
  { value: '', label: t('blog.allCategories') },
  ...CATEGORY_OPTIONS.map(cat => ({
    value: cat,
    label: t(`blog.categories.${cat}`)
  }))
])

// Status options
const statusOptions = computed(() => [
  { value: '', label: t('blog.allStatus') },
  { value: 'DRAFT', label: t('blog.postStatuses.draft') },
  { value: 'PUBLISHED', label: t('blog.postStatuses.published') },
  { value: 'ARCHIVED', label: t('blog.postStatuses.archived') },
])

const sortOptions = computed(() => [
  { value: 'createdAt_desc', label: '建立時間（新到舊）' },
  { value: 'createdAt_asc', label: '建立時間（舊到新）' },
  { value: 'updatedAt_desc', label: '更新時間（新到舊）' },
  { value: 'publishedAt_desc', label: '發布時間（新到舊）' },
  { value: 'publishedAt_asc', label: '發布時間（舊到新）' },
  { value: 'title_asc', label: '標題（A → Z）' },
  { value: 'title_desc', label: '標題（Z → A）' }
])

// Fetch posts
const fetchPosts = async (page = 1) => {
  try {
    loading.value = true
    const query = buildAdminBlogQueryString({
      page,
      limit: pagination.value.limit,
      filters: filters.value,
    })

    const response = await $fetch(`/api/blog/admin?${query}`) as any

    posts.value = response.data
    pagination.value = response.pagination
    selectedPosts.value = new Set()
  } catch (error: any) {
    console.error('Failed to fetch posts:', error)
    toast.error(error.data?.statusMessage || t('blog.loadFailed'))
  } finally {
    loading.value = false
  }
}

// Publish post
const publishPost = async (postId: string) => {
  try {
    await $fetch(`/api/blog/admin/${postId}/publish`, { method: 'POST' })
    toast.success(t('blog.publishSuccess'))
    await fetchPosts(pagination.value.page)
  } catch (error: any) {
    console.error('Failed to publish post:', error)
    toast.error(error.data?.statusMessage || t('blog.publishFailed'))
  }
}

// Archive post
const archivePost = async (postId: string) => {
  if (!confirm(t('blog.confirmArchive'))) return

  try {
    await $fetch(`/api/blog/admin/${postId}/archive`, { method: 'POST' })
    toast.success(t('blog.archiveSuccess'))
    await fetchPosts(pagination.value.page)
  } catch (error: any) {
    console.error('Failed to archive post:', error)
    toast.error(error.data?.statusMessage || t('blog.archiveFailed'))
  }
}

// Delete post
const deletePost = async (postId: string, postTitle: string) => {
  if (!confirm(t('blog.confirmDelete', { title: postTitle }))) return

  try {
    await $fetch(`/api/blog/${postId}`, { method: 'DELETE' })
    toast.success(t('blog.deleteSuccess'))
    const nextPage = resolveReloadPageAfterDelete({
      currentPage: pagination.value.page,
      totalPages: pagination.value.totalPages,
      visibleCount: posts.value.length,
    })
    await fetchPosts(nextPage)
  } catch (error: any) {
    console.error('Failed to delete post:', error)
    toast.error(error.data?.statusMessage || t('blog.deleteFailed'))
  }
}

// Handle filters change
let filterTimer: ReturnType<typeof setTimeout> | null = null
const handleFilterChange = () => {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    fetchPosts(1)
  }, 500)
}

watch(() => [filters.value.status, filters.value.category], handleFilterChange)
watch(
  () => [filters.value.search, filters.value.author, filters.value.dateFrom, filters.value.dateTo, filters.value.sortBy],
  handleFilterChange
)

// Load data on mount
onMounted(() => {
  fetchPosts(1)
})

const statusBadgeClass = (status: string) => getBlogStatusBadgeClass(status)

const statusLabel = (status: string) => getBlogStatusLabel(status, t)

const isSelected = (postId: string) => selectedPosts.value.has(postId)

const toggleSelection = (postId: string) => {
  selectedPosts.value = toggleSelectionId(selectedPosts.value, postId)
}

const isAllSelected = computed(() => {
  if (posts.value.length === 0) return false
  return posts.value.every((post) => selectedPosts.value.has(String(post.id)))
})

const toggleSelectAll = () => {
  selectedPosts.value = toggleSelectAllIds(posts.value.map(post => String(post.id)), selectedPosts.value)
}

const bulkPublish = async () => {
  const ids = Array.from(selectedPosts.value)
  if (ids.length === 0) return
  try {
    await $fetch('/api/blog/admin/bulk-publish', {
      method: 'POST',
      body: { ids }
    })
    toast.success('已批量發布')
    await fetchPosts(pagination.value.page)
  } catch (error: any) {
    console.error('Failed to bulk publish:', error)
    toast.error(error.data?.statusMessage || '批量發布失敗')
  }
}

const bulkDelete = async () => {
  const ids = Array.from(selectedPosts.value)
  if (ids.length === 0) return
  if (!confirm(`確定刪除選取的 ${ids.length} 篇文章？`)) return
  try {
    await $fetch('/api/blog/admin/bulk-delete', {
      method: 'POST',
      body: { ids }
    })
    toast.success('已批量刪除')
    await fetchPosts(pagination.value.page)
  } catch (error: any) {
    console.error('Failed to bulk delete:', error)
    toast.error(error.data?.statusMessage || '批量刪除失敗')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ $t('blog.manageBlog') }}
          </h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            管理博客文章
          </p>
        </div>
        <NuxtLink
          to="/admin/blog/new"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <i-heroicons-plus class="mr-2 h-5 w-5" />
          新增文章
        </NuxtLink>
      </div>

      <!-- Filters -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6 space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <!-- Search -->
          <div class="md:col-span-2 xl:col-span-2">
            <label for="search" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              搜尋標題
            </label>
            <div class="relative">
              <input
                v-model="filters.search"
                type="text"
                id="search"
                placeholder="搜尋文章標題..."
                class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i-heroicons-magnifying-glass class="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <!-- Author -->
          <div class="md:col-span-1 xl:col-span-1">
            <label for="author" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              作者
            </label>
            <input
              id="author"
              v-model="filters.author"
              type="text"
              placeholder="姓名或信箱"
              class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
            />
          </div>

          <!-- Status Filter -->
          <div>
            <label for="status" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              狀態
            </label>
            <select
              id="status"
              v-model="filters.status"
              class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
            >
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Category Filter -->
          <div>
            <label for="category" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              分類
            </label>
            <select
              id="category"
              v-model="filters.category"
              class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
            >
              <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
          </div>

          <!-- Date From -->
          <div>
            <label for="dateFrom" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              開始日期
            </label>
            <input
              id="dateFrom"
              v-model="filters.dateFrom"
              type="date"
              class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
            />
          </div>

          <!-- Date To -->
          <div>
            <label for="dateTo" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              結束日期
            </label>
            <input
              id="dateTo"
              v-model="filters.dateTo"
              type="date"
              class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
            />
          </div>

          <!-- Sort -->
          <div>
            <label for="sortBy" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              排序
            </label>
            <select
              id="sortBy"
              v-model="filters.sortBy"
              class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
            >
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="selectedCount > 0" class="flex flex-wrap items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-900/30 dark:text-indigo-100">
          <span>已選取 {{ selectedCount }} 筆</span>
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
            @click="bulkPublish"
          >
            批量發布
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            @click="bulkDelete"
          >
            批量刪除
          </button>
        </div>
      </div>

      <!-- Posts Table -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    class="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                  />
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  標題
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  分類
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  狀態
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  作者
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  建立時間
                </th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-if="loading" role="status" aria-live="polite">
                <td colspan="7" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  <div class="flex justify-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" aria-hidden="true"></div>
                  </div>
                  <span class="sr-only">{{ $t('common.loading') || '載入中...' }}</span>
                </td>
              </tr>
              <tr v-else-if="posts.length === 0">
                <td colspan="7" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  沒有找到文章
                </td>
              </tr>
              <tr v-else v-for="post in posts" :key="post.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-6 py-4">
                  <input
                    type="checkbox"
                    class="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    :checked="isSelected(String(post.id))"
                    @change="toggleSelection(String(post.id))"
                  />
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ post.title }}
                  </div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    /articles/{{ post.slug }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ post.category }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full" :class="statusBadgeClass(post.status)">
                    {{ statusLabel(post.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ post.author.name || post.author.email }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(post.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end gap-2">
                    <!-- Edit -->
                    <NuxtLink
                      :to="`/admin/blog/${post.id}/edit`"
                      class="inline-flex items-center justify-center p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors"
                      title="編輯"
                    >
                      <i-heroicons-pencil class="h-5 w-5" />
                    </NuxtLink>

                    <!-- Publish (if draft) -->
                    <button
                      v-if="post.status === 'DRAFT'"
                      @click="publishPost(post.id)"
                      class="inline-flex items-center justify-center p-2 rounded-lg text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
                      title="發布"
                    >
                      <i-heroicons-check-circle class="h-5 w-5" />
                    </button>

                    <!-- Archive (if published) -->
                    <button
                      v-if="post.status === 'PUBLISHED'"
                      @click="archivePost(post.id)"
                      class="inline-flex items-center justify-center p-2 rounded-lg text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/30 transition-colors"
                      title="歸檔"
                    >
                      <i-heroicons-archive-box class="h-5 w-5" />
                    </button>

                    <!-- Delete -->
                    <button
                      @click="deletePost(post.id, post.title)"
                      class="inline-flex items-center justify-center p-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                      title="刪除"
                    >
                      <i-heroicons-trash class="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div class="flex items-center justify-between">
            <div class="flex-1 flex justify-between sm:hidden">
              <button
                @click="fetchPosts(pagination.page - 1)"
                :disabled="pagination.page === 1"
                class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一頁
              </button>
              <button
                @click="fetchPosts(pagination.page + 1)"
                :disabled="pagination.page === pagination.totalPages"
                class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一頁
              </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  顯示
                  <span class="font-medium">{{ Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total) }}</span>
                  至
                  <span class="font-medium">{{ Math.min(pagination.page * pagination.limit, pagination.total) }}</span>
                  共
                  <span class="font-medium">{{ pagination.total }}</span>
                  筆結果
                </p>
              </div>
              <div>
                <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    @click="fetchPosts(pagination.page - 1)"
                    :disabled="pagination.page === 1"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i-heroicons-chevron-left class="h-5 w-5" />
                  </button>
                  <button
                    @click="fetchPosts(pagination.page + 1)"
                    :disabled="pagination.page === pagination.totalPages"
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i-heroicons-chevron-right class="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
