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
import { resolveErrorMessage } from '~/composables/useErrorI18n'

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
  { value: 'createdAt_desc', label: t('blog.sort.createdAtDesc') },
  { value: 'createdAt_asc', label: t('blog.sort.createdAtAsc') },
  { value: 'updatedAt_desc', label: t('blog.sort.updatedAtDesc') },
  { value: 'publishedAt_desc', label: t('blog.sort.publishedAtDesc') },
  { value: 'publishedAt_asc', label: t('blog.sort.publishedAtAsc') },
  { value: 'title_asc', label: t('blog.sort.titleAsc') },
  { value: 'title_desc', label: t('blog.sort.titleDesc') }
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
    toast.error(resolveErrorMessage(error, t, t('blog.loadFailed')))
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
    toast.error(resolveErrorMessage(error, t, t('blog.publishFailed')))
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
    toast.error(resolveErrorMessage(error, t, t('blog.archiveFailed')))
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
    toast.error(resolveErrorMessage(error, t, t('blog.deleteFailed')))
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
    toast.success(t('blog.bulkPublishSuccess'))
    await fetchPosts(pagination.value.page)
  } catch (error: any) {
    console.error('Failed to bulk publish:', error)
    toast.error(resolveErrorMessage(error, t, t('blog.bulkPublishFailed')))
  }
}

const bulkDelete = async () => {
  const ids = Array.from(selectedPosts.value)
  if (ids.length === 0) return
  if (!confirm(t('blog.confirmBulkDelete', { count: ids.length }))) return
  try {
    await $fetch('/api/blog/admin/bulk-delete', {
      method: 'POST',
      body: { ids }
    })
    toast.success(t('blog.bulkDeleteSuccess'))
    await fetchPosts(pagination.value.page)
  } catch (error: any) {
    console.error('Failed to bulk delete:', error)
    toast.error(resolveErrorMessage(error, t, t('blog.bulkDeleteFailed')))
  }
}
</script>

<template>
  <div class="min-h-screen bg-dt-bg">
    <PageContainer width="wide" class="py-8">
      <!-- Header -->
      <div class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-dt-text">
            {{ $t('blog.manageBlog') }}
          </h1>
          <p class="mt-2 text-sm text-dt-text-muted">
            {{ $t('blog.manageDescription') }}
          </p>
        </div>
        <NuxtLink
          to="/admin/blog/new"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-dt-primary-solid hover:bg-dt-primary-solid-active focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dt-primary/30"
        >
          <i-heroicons-plus class="mr-2 h-5 w-5" />
          {{ $t('blog.addPost') }}
        </NuxtLink>
      </div>

      <!-- Filters -->
      <div class="bg-dt-surface shadow rounded-lg p-4 mb-6 space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <!-- Search -->
          <div class="md:col-span-2 xl:col-span-2">
            <label for="search" class="block text-sm font-medium text-dt-text mb-1">
              {{ $t('blog.searchTitle') }}
            </label>
            <div class="relative">
              <input
                v-model="filters.search"
                type="text"
                id="search"
                :placeholder="$t('blog.searchTitlePlaceholder')"
                class="block w-full pl-10 pr-3 py-2 border border-dt-border rounded-md leading-5 bg-dt-surface-strong placeholder:text-dt-text-soft focus:outline-none focus:ring-2 focus:ring-dt-primary/30 focus:border-dt-primary sm:text-sm text-dt-text"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i-heroicons-magnifying-glass class="h-5 w-5 text-dt-text-soft" />
              </div>
            </div>
          </div>

          <!-- Author -->
          <div class="md:col-span-1 xl:col-span-1">
            <label for="author" class="block text-sm font-medium text-dt-text mb-1">
              {{ $t('blog.author') }}
            </label>
            <input
              id="author"
              v-model="filters.author"
              type="text"
              :placeholder="$t('blog.authorPlaceholder')"
              class="block w-full px-3 py-2 border border-dt-border rounded-md leading-5 bg-dt-surface-strong placeholder:text-dt-text-soft focus:outline-none focus:ring-2 focus:ring-dt-primary/30 focus:border-dt-primary sm:text-sm text-dt-text"
            />
          </div>

          <!-- Status Filter -->
          <div>
            <label for="status" class="block text-sm font-medium text-dt-text mb-1">
              {{ $t('blog.postStatus') }}
            </label>
            <select
              id="status"
              v-model="filters.status"
              class="block w-full px-3 py-2 border border-dt-border rounded-md leading-5 bg-dt-surface-strong focus:outline-none focus:ring-2 focus:ring-dt-primary/30 focus:border-dt-primary sm:text-sm text-dt-text"
            >
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Category Filter -->
          <div>
            <label for="category" class="block text-sm font-medium text-dt-text mb-1">
              {{ $t('blog.category') }}
            </label>
            <select
              id="category"
              v-model="filters.category"
              class="block w-full px-3 py-2 border border-dt-border rounded-md leading-5 bg-dt-surface-strong focus:outline-none focus:ring-2 focus:ring-dt-primary/30 focus:border-dt-primary sm:text-sm text-dt-text"
            >
              <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
          </div>

          <!-- Date From -->
          <div>
            <label for="dateFrom" class="block text-sm font-medium text-dt-text mb-1">
              {{ $t('blog.dateFrom') }}
            </label>
            <input
              id="dateFrom"
              v-model="filters.dateFrom"
              type="date"
              class="block w-full px-3 py-2 border border-dt-border rounded-md leading-5 bg-dt-surface-strong focus:outline-none focus:ring-2 focus:ring-dt-primary/30 focus:border-dt-primary sm:text-sm text-dt-text"
            />
          </div>

          <!-- Date To -->
          <div>
            <label for="dateTo" class="block text-sm font-medium text-dt-text mb-1">
              {{ $t('blog.dateTo') }}
            </label>
            <input
              id="dateTo"
              v-model="filters.dateTo"
              type="date"
              class="block w-full px-3 py-2 border border-dt-border rounded-md leading-5 bg-dt-surface-strong focus:outline-none focus:ring-2 focus:ring-dt-primary/30 focus:border-dt-primary sm:text-sm text-dt-text"
            />
          </div>

          <!-- Sort -->
          <div>
            <label for="sortBy" class="block text-sm font-medium text-dt-text mb-1">
              {{ $t('blog.sortLabel') }}
            </label>
            <select
              id="sortBy"
              v-model="filters.sortBy"
              class="block w-full px-3 py-2 border border-dt-border rounded-md leading-5 bg-dt-surface-strong focus:outline-none focus:ring-2 focus:ring-dt-primary/30 focus:border-dt-primary sm:text-sm text-dt-text"
            >
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="selectedCount > 0" class="flex flex-wrap items-center gap-3 rounded-lg border border-dt-primary/20 bg-dt-primary/10 px-4 py-3 text-sm text-dt-primary">
          <span>{{ $t('blog.selectedCount', { count: selectedCount }) }}</span>
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-dt-primary-solid px-3 py-1.5 text-xs font-semibold text-white hover:bg-dt-primary-solid-active"
            @click="bulkPublish"
          >
            {{ $t('blog.bulkPublish') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-dt-danger px-3 py-1.5 text-xs font-semibold text-white hover:bg-dt-danger-strong"
            @click="bulkDelete"
          >
            {{ $t('blog.bulkDelete') }}
          </button>
        </div>
      </div>

      <!-- Posts Table -->
      <div class="bg-dt-surface shadow rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-dt-border">
            <thead class="bg-dt-bg">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dt-text-soft uppercase tracking-wider">
                  <input
                    type="checkbox"
                    class="h-4 w-4 text-dt-primary border-dt-border rounded"
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                  />
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dt-text-soft uppercase tracking-wider">
                  {{ $t('blog.title') }}
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dt-text-soft uppercase tracking-wider">
                  {{ $t('blog.category') }}
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dt-text-soft uppercase tracking-wider">
                  {{ $t('blog.postStatus') }}
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dt-text-soft uppercase tracking-wider">
                  {{ $t('blog.author') }}
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dt-text-soft uppercase tracking-wider">
                  {{ $t('blog.createdAt') }}
                </th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-dt-text-soft uppercase tracking-wider">
                  {{ $t('blog.actions') }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-dt-surface divide-y divide-dt-border">
              <tr v-if="loading" role="status" aria-live="polite">
                <td colspan="7" class="px-6 py-4 text-center text-dt-text-soft">
                  <div class="flex justify-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-dt-primary" aria-hidden="true"></div>
                  </div>
                  <span class="sr-only">{{ $t('common.loading') }}</span>
                </td>
              </tr>
              <tr v-else-if="posts.length === 0">
                <td colspan="7" class="px-6 py-4 text-center text-dt-text-soft">
                  {{ $t('blog.noPosts') }}
                </td>
              </tr>
              <tr v-else v-for="post in posts" :key="post.id" class="hover:bg-dt-surface-strong">
                <td class="px-6 py-4">
                  <input
                    type="checkbox"
                    class="h-4 w-4 text-dt-primary border-dt-border rounded"
                    :checked="isSelected(String(post.id))"
                    @change="toggleSelection(String(post.id))"
                  />
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm font-medium text-dt-text">
                    {{ post.title }}
                  </div>
                  <div class="text-sm text-dt-text-soft">
                    /articles/{{ post.slug }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-dt-text">
                  {{ post.category }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full" :class="statusBadgeClass(post.status)">
                    {{ statusLabel(post.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-dt-text">
                  {{ post.author.name || post.author.email }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-dt-text-soft">
                  {{ formatDate(post.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end gap-2">
                    <!-- Edit -->
                    <NuxtLink
                      :to="`/admin/blog/${post.id}/edit`"
                      class="inline-flex items-center justify-center p-2 rounded-lg text-dt-primary hover:bg-dt-primary/10 transition-colors"
                      :title="$t('common.edit')"
                    >
                      <i-heroicons-pencil class="h-5 w-5" />
                    </NuxtLink>

                    <!-- Publish (if draft) -->
                    <button
                      v-if="post.status === 'DRAFT'"
                      @click="publishPost(post.id)"
                      class="inline-flex items-center justify-center p-2 rounded-lg text-dt-success hover:bg-dt-success/10 transition-colors"
                      :title="$t('blog.publish')"
                    >
                      <i-heroicons-check-circle class="h-5 w-5" />
                    </button>

                    <!-- Archive (if published) -->
                    <button
                      v-if="post.status === 'PUBLISHED'"
                      @click="archivePost(post.id)"
                      class="inline-flex items-center justify-center p-2 rounded-lg text-dt-warning hover:bg-dt-warning/10 transition-colors"
                      :title="$t('blog.archive')"
                    >
                      <i-heroicons-archive-box class="h-5 w-5" />
                    </button>

                    <!-- Delete -->
                    <button
                      @click="deletePost(post.id, post.title)"
                      class="inline-flex items-center justify-center p-2 rounded-lg text-dt-danger hover:bg-dt-danger/10 transition-colors"
                      :title="$t('common.delete')"
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
        <div v-if="pagination.totalPages > 1" class="bg-dt-surface px-4 py-3 border-t border-dt-border sm:px-6">
          <div class="flex items-center justify-between">
            <div class="flex-1 flex justify-between sm:hidden">
              <button
                @click="fetchPosts(pagination.page - 1)"
                :disabled="pagination.page === 1"
                class="relative inline-flex items-center px-4 py-2 border border-dt-border text-sm font-medium rounded-md text-dt-text bg-dt-surface hover:bg-dt-surface-strong disabled:opacity-50 disabled:cursor-not-allowed"
              >
                    {{ $t('blog.previousPage') }}
              </button>
              <button
                @click="fetchPosts(pagination.page + 1)"
                :disabled="pagination.page === pagination.totalPages"
                class="ml-3 relative inline-flex items-center px-4 py-2 border border-dt-border text-sm font-medium rounded-md text-dt-text bg-dt-surface hover:bg-dt-surface-strong disabled:opacity-50 disabled:cursor-not-allowed"
              >
                    {{ $t('blog.nextPage') }}
              </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-dt-text">
                  {{ $t('blog.showingResults', {
                    from: Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total),
                    to: Math.min(pagination.page * pagination.limit, pagination.total),
                    total: pagination.total,
                  }) }}
                </p>
              </div>
              <div>
                <nav aria-label="pagination" class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    @click="fetchPosts(pagination.page - 1)"
                    :disabled="pagination.page === 1"
                    :aria-label="$t('admin.pagination.previous')"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-dt-border bg-dt-surface text-sm font-medium text-dt-text-soft hover:bg-dt-surface-strong disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i-heroicons-chevron-left class="h-5 w-5" />
                  </button>
                  <button
                    @click="fetchPosts(pagination.page + 1)"
                    :disabled="pagination.page === pagination.totalPages"
                    :aria-label="$t('admin.pagination.next')"
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-dt-border bg-dt-surface text-sm font-medium text-dt-text-soft hover:bg-dt-surface-strong disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i-heroicons-chevron-right class="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  </div>
</template>
