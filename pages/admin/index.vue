<script setup lang="ts">
const { t } = useI18n()
const { user: currentUser, isAuthenticated, isAdmin } = useAuth()
const toast = useToast()

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
const stats = ref<any>(null)
const users = ref<any[]>([])
const loading = ref({
  stats: true,
  users: true
})
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0
})
const searchQuery = ref('')

// Fetch stats
const fetchStats = async () => {
  try {
    loading.value.stats = true
    const response = await $fetch('/api/admin/stats') as any
    if (response.success) {
      stats.value = response.data
    }
  } catch (error: any) {
    console.error('Failed to fetch stats:', error)
    toast.error(error.data?.statusMessage || t('admin.error.fetchStatsFailed'))
  } finally {
    loading.value.stats = false
  }
}

// Fetch users
const fetchUsers = async (page = 1) => {
  try {
    loading.value.users = true
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pagination.value.limit.toString()
    })
    if (searchQuery.value) {
      params.append('search', searchQuery.value)
    }

    const response = await $fetch(`/api/admin/users?${params.toString()}`) as any
    if (response.success) {
      users.value = response.data
      pagination.value = response.pagination
    }
  } catch (error: any) {
    console.error('Failed to fetch users:', error)
    toast.error(error.data?.statusMessage || t('admin.error.fetchUsersFailed'))
  } finally {
    loading.value.users = false
  }
}

// Update user role
const updateUserRole = async (userId: string, newRole: 'USER' | 'ADMIN') => {
  try {
    const response = await $fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: { role: newRole }
    }) as any

    if (response.success) {
      toast.success(t('admin.success.roleUpdated'))
      await fetchUsers(pagination.value.page)
    }
  } catch (error: any) {
    console.error('Failed to update user role:', error)
    toast.error(error.data?.statusMessage || t('admin.error.updateRoleFailed'))
  }
}

// Delete user
const deleteUser = async (userId: string, userEmail: string) => {
  if (!confirm(t('admin.confirmDelete', { email: userEmail }))) {
    return
  }

  try {
    const response = await $fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    }) as any

    if (response.success) {
      toast.success(t('admin.success.userDeleted'))
      // Refresh current page or go to previous if empty
      const currentPage = pagination.value.page
      const isLastPage = currentPage === pagination.value.totalPages
      const isEmptyPage = users.value.length === 1

      if (isLastPage && isEmptyPage && currentPage > 1) {
        await fetchUsers(currentPage - 1)
      } else {
        await fetchUsers(currentPage)
      }
    }
  } catch (error: any) {
    console.error('Failed to delete user:', error)
    toast.error(error.data?.statusMessage || t('admin.error.deleteUserFailed'))
  }
}

// Handle search
let searchTimer: ReturnType<typeof setTimeout> | null = null
const handleSearch = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchUsers(1)
  }, 500)
}

watch(searchQuery, handleSearch)

// Load data on mount
onMounted(() => {
  fetchStats()
  fetchUsers(1)
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

// Role badge color
const roleBadgeClass = (role: string) => {
  return role === 'ADMIN'
    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ t('admin.title') }}
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ t('admin.subtitle') }}
        </p>
      </div>

      <!-- Stats Grid -->
      <div v-if="stats || loading.stats" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <!-- Users -->
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <Icon name="heroicons:users" class="h-6 w-6 text-gray-400" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {{ t('admin.stats.totalUsers') }}
                  </dt>
                  <dd v-if="!loading.stats" class="text-lg font-medium text-gray-900 dark:text-white">
                    {{ stats?.users?.total || 0 }}
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                      ({{ t('admin.stats.admins') }}: {{ stats?.users?.admin || 0 }})
                    </span>
                  </dd>
                  <dd v-else class="text-lg font-medium text-gray-900 dark:text-white">
                    <div class="animate-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <!-- Diaries -->
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <Icon name="heroicons:book-open" class="h-6 w-6 text-gray-400" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {{ t('admin.stats.totalDiaries') }}
                  </dt>
                  <dd v-if="!loading.stats" class="text-lg font-medium text-gray-900 dark:text-white">
                    {{ stats?.diaries?.total || 0 }}
                  </dd>
                  <dd v-else class="text-lg font-medium text-gray-900 dark:text-white">
                    <div class="animate-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <!-- Alerts -->
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <Icon name="heroicons:bell" class="h-6 w-6 text-gray-400" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {{ t('admin.stats.totalAlerts') }}
                  </dt>
                  <dd v-if="!loading.stats" class="text-lg font-medium text-gray-900 dark:text-white">
                    {{ stats?.alerts?.total || 0 }}
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                      ({{ t('admin.stats.active') }}: {{ stats?.alerts?.active || 0 }})
                    </span>
                  </dd>
                  <dd v-else class="text-lg font-medium text-gray-900 dark:text-white">
                    <div class="animate-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <!-- Transactions -->
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <Icon name="heroicons:currency-dollar" class="h-6 w-6 text-gray-400" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {{ t('admin.stats.totalTransactions') }}
                  </dt>
                  <dd v-if="!loading.stats" class="text-lg font-medium text-gray-900 dark:text-white">
                    {{ stats?.transactions?.total || 0 }}
                  </dd>
                  <dd v-else class="text-lg font-medium text-gray-900 dark:text-white">
                    <div class="animate-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Users Management -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div class="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              {{ t('admin.users.title') }}
            </h3>
            <!-- Search -->
            <div class="relative">
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="t('admin.users.searchPlaceholder')"
                class="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="heroicons:magnifying-glass" class="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <!-- Users table -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {{ t('admin.users.email') }}
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {{ t('admin.users.name') }}
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {{ t('admin.users.role') }}
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {{ t('admin.users.stats') }}
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {{ t('admin.users.createdAt') }}
                </th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {{ t('admin.users.actions') }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-if="loading.users">
                <td :colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  <div class="flex justify-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  </div>
                </td>
              </tr>
              <tr v-else-if="users.length === 0">
                <td :colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  {{ t('admin.users.noUsers') }}
                </td>
              </tr>
              <tr v-else v-for="user in users" :key="user.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ user.email }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ user.name || '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <select
                    :value="user.role"
                    @change="updateUserRole(user.id, ($event.target as HTMLSelectElement).value as 'USER' | 'ADMIN')"
                    :disabled="user.id === currentUser?.id"
                    class="text-sm rounded-md px-2 py-1 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    :class="roleBadgeClass(user.role)"
                    :title="user.id === currentUser?.id ? t('admin.users.cannotModifyOwnRole') : ''"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <span class="mr-2">{{ t('admin.diaries') }}: {{ user._count.diaries }}</span>
                  <span class="mr-2">{{ t('admin.alerts') }}: {{ user._count.alerts }}</span>
                  <span>{{ t('admin.transactions') }}: {{ user._count.transactions }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(user.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    v-if="user.id !== currentUser?.id"
                    @click="deleteUser(user.id, user.email)"
                    class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    {{ t('admin.users.delete') }}
                  </button>
                  <span v-else class="text-gray-400 dark:text-gray-600">
                    {{ t('admin.users.current') }}
                  </span>
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
                @click="fetchUsers(pagination.page - 1)"
                :disabled="pagination.page === 1"
                class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ t('admin.pagination.previous') }}
              </button>
              <button
                @click="fetchUsers(pagination.page + 1)"
                :disabled="pagination.page === pagination.totalPages"
                class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ t('admin.pagination.next') }}
              </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  {{ t('admin.pagination.showing') }}
                  <span class="font-medium">{{ Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total) }}</span>
                  {{ t('admin.pagination.to') }}
                  <span class="font-medium">{{ Math.min(pagination.page * pagination.limit, pagination.total) }}</span>
                  {{ t('admin.pagination.of') }}
                  <span class="font-medium">{{ pagination.total }}</span>
                  {{ t('admin.pagination.results') }}
                </p>
              </div>
              <div>
                <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    @click="fetchUsers(pagination.page - 1)"
                    :disabled="pagination.page === 1"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icon name="heroicons:chevron-left" class="h-5 w-5" />
                  </button>
                  <button
                    @click="fetchUsers(pagination.page + 1)"
                    :disabled="pagination.page === pagination.totalPages"
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icon name="heroicons:chevron-right" class="h-5 w-5" />
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
