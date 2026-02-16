<script setup lang="ts">
const { t } = useI18n()
const { isAuthenticated, isAdmin } = useAuth()
const toast = useToast()
const router = useRouter()

// Client-side guard for admin page
watchEffect(() => {
  if (!process.client) return

  if (!isAuthenticated.value) {
    navigateTo('/auth/login')
  } else if (!isAdmin.value) {
    navigateTo('/')
  }
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
  search: ''
})

// Categories
const categories = [
  { value: '', label: '全部分類' },
  { value: '基本面分析', label: '基本面分析' },
  { value: '技术面分析', label: '技術面分析' },
  { value: '市场观察', label: '市場觀察' },
  { value: '投资策略', label: '投資策略' },
]

// Status options
const statusOptions = [
  { value: '', label: '全部狀態' },
  { value: 'DRAFT', label: '草稿' },
  { value: 'PUBLISHED', label: '已發布' },
  { value: 'ARCHIVED', label: '已歸檔' },
]

// Fetch posts
const fetchPosts = async (page = 1) => {
  try {
    loading.value = true
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pagination.value.limit.toString()
    })

    if (filters.value.status) params.append('status', filters.value.status)
    if (filters.value.category) params.append('category', filters.value.category)
    if (filters.value.search) params.append('search', filters.value.search)

    const response = await $fetch(`/api/blog/admin?${params.toString()}`) as any

    posts.value = response.data
    pagination.value = response.pagination
  } catch (error: any) {
    console.error('Failed to fetch posts:', error)
    toast.error(error.data?.statusMessage || '載入失敗')
  } finally {
    loading.value = false
  }
}

// Publish post
const publishPost = async (postId: string) => {
  try {
    await $fetch(`/api/blog/admin/${postId}/publish`, { method: 'POST' })
    toast.success('文章已發布')
    await fetchPosts(pagination.value.page)
  } catch (error: any) {
    console.error('Failed to publish post:', error)
    toast.error(error.data?.statusMessage || '發布失敗')
  }
}

// Archive post
const archivePost = async (postId: string) => {
  if (!confirm('確定要歸檔這篇文章嗎？')) return

  try {
    await $fetch(`/api/blog/admin/${postId}/archive`, { method: 'POST' })
    toast.success('文章已歸檔')
    await fetchPosts(pagination.value.page)
  } catch (error: any) {
    console.error('Failed to archive post:', error)
    toast.error(error.data?.statusMessage || '歸檔失敗')
  }
}

// Delete post
const deletePost = async (postId: string, postTitle: string) => {
  if (!confirm(`確定要刪除文章「${postTitle}」嗎？此操作無法復原。`)) return

  try {
    await $fetch(`/api/blog/${postId}`, { method: 'DELETE' })
    toast.success('文章已刪除')
    // Refresh current page or go to previous if empty
    const currentPage = pagination.value.page
    const isLastPage = currentPage === pagination.value.totalPages
    const isEmptyPage = posts.value.length === 1

    if (isLastPage && isEmptyPage && currentPage > 1) {
      await fetchPosts(currentPage - 1)
    } else {
      await fetchPosts(currentPage)
    }
  } catch (error: any) {
    console.error('Failed to delete post:', error)
    toast.error(error.data?.statusMessage || '刪除失敗')
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
watch(() => filters.value.search, handleFilterChange)

// Load data on mount
onMounted(() => {
  fetchPosts(1)
})

// Format date
const formatDate = (date: string | Date) => {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

// Status badge class
const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'DRAFT':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'ARCHIVED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

const statusLabel = (status: string) => {
  switch (status) {
    case 'PUBLISHED': return '已發布'
    case 'DRAFT': return '草稿'
    case 'ARCHIVED': return '已歸檔'
    default: return status
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
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <!-- Search -->
          <div class="sm:col-span-2">
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
        </div>
      </div>

      <!-- Posts Table -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
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
              <tr v-if="loading">
                <td colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  <div class="flex justify-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  </div>
                </td>
              </tr>
              <tr v-else-if="posts.length === 0">
                <td colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  沒有找到文章
                </td>
              </tr>
              <tr v-else v-for="post in posts" :key="post.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-6 py-4">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ post.title }}
                  </div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    /blog/{{ post.slug }}
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
                      class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      title="編輯"
                    >
                      <i-heroicons-pencil class="h-5 w-5" />
                    </NuxtLink>

                    <!-- Publish (if draft) -->
                    <button
                      v-if="post.status === 'DRAFT'"
                      @click="publishPost(post.id)"
                      class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      title="發布"
                    >
                      <i-heroicons-check-circle class="h-5 w-5" />
                    </button>

                    <!-- Archive (if published) -->
                    <button
                      v-if="post.status === 'PUBLISHED'"
                      @click="archivePost(post.id)"
                      class="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                      title="歸檔"
                    >
                      <i-heroicons-archive-box class="h-5 w-5" />
                    </button>

                    <!-- Delete -->
                    <button
                      @click="deletePost(post.id, post.title)"
                      class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
