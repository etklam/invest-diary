<script setup lang="ts">
import { formatDate } from '~/lib/dates'
import { buildAdminUsersQueryString, resolveReloadPageAfterDelete } from '~/lib/admin/user-management'
import { resolveErrorMessage } from '~/composables/useErrorI18n'

const { t } = useI18n()
const { user: currentUser } = useAuth()
const toast = useToast()

definePageMeta({
  middleware: 'admin',
  requiresAuth: true,
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
    toast.error(resolveErrorMessage(error, t, t('admin.error.fetchStatsFailed')))
  } finally {
    loading.value.stats = false
  }
}

// Fetch users
const fetchUsers = async (page = 1) => {
  try {
    loading.value.users = true
    const query = buildAdminUsersQueryString({
      page,
      limit: pagination.value.limit,
      search: searchQuery.value,
    })

    const response = await $fetch(`/api/admin/users?${query}`) as any
    if (response.success) {
      users.value = response.data
      pagination.value = response.pagination
    }
  } catch (error: any) {
    console.error('Failed to fetch users:', error)
    toast.error(resolveErrorMessage(error, t, t('admin.error.fetchUsersFailed')))
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
    toast.error(resolveErrorMessage(error, t, t('admin.error.updateRoleFailed')))
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
      const nextPage = resolveReloadPageAfterDelete({
        currentPage: pagination.value.page,
        totalPages: pagination.value.totalPages,
        visibleCount: users.value.length,
      })
      await fetchUsers(nextPage)
    }
  } catch (error: any) {
    console.error('Failed to delete user:', error)
    toast.error(resolveErrorMessage(error, t, t('admin.error.deleteUserFailed')))
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

// Role badge color
const roleBadgeClass = (role: string) => {
  return role === 'ADMIN'
    ? 'bg-dt-danger/10 text-dt-danger-strong'
    : 'bg-dt-surface-strong text-dt-text'
}
</script>

<template>
  <div class="min-h-screen bg-dt-bg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-dt-text">
          {{ t('admin.title') }}
        </h1>
        <p class="mt-2 text-sm text-dt-text-muted">
          {{ t('admin.subtitle') }}
        </p>
      </div>

      <!-- Stats Grid -->
      <div v-if="stats || loading.stats" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <!-- Users -->
        <div class="bg-dt-surface overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <Icon name="heroicons:users" class="h-6 w-6 text-dt-text-soft" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-dt-text-soft truncate">
                    {{ t('admin.stats.totalUsers') }}
                  </dt>
                  <dd v-if="!loading.stats" class="text-lg font-medium text-dt-text">
                    {{ stats?.users?.total || 0 }}
                    <span class="text-sm text-dt-text-soft">
                      ({{ t('admin.stats.admins') }}: {{ stats?.users?.admin || 0 }})
                    </span>
                  </dd>
                  <dd v-else class="text-lg font-medium text-dt-text">
                    <div class="animate-pulse h-6 bg-dt-surface-muted rounded"></div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <!-- Diaries -->
        <div class="bg-dt-surface overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <Icon name="heroicons:book-open" class="h-6 w-6 text-dt-text-soft" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-dt-text-soft truncate">
                    {{ t('admin.stats.totalDiaries') }}
                  </dt>
                  <dd v-if="!loading.stats" class="text-lg font-medium text-dt-text">
                    {{ stats?.diaries?.total || 0 }}
                  </dd>
                  <dd v-else class="text-lg font-medium text-dt-text">
                    <div class="animate-pulse h-6 bg-dt-surface-muted rounded"></div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <!-- Alerts -->
        <div class="bg-dt-surface overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <Icon name="heroicons:bell" class="h-6 w-6 text-dt-text-soft" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-dt-text-soft truncate">
                    {{ t('admin.stats.totalAlerts') }}
                  </dt>
                  <dd v-if="!loading.stats" class="text-lg font-medium text-dt-text">
                    {{ stats?.alerts?.total || 0 }}
                    <span class="text-sm text-dt-text-soft">
                      ({{ t('admin.stats.active') }}: {{ stats?.alerts?.active || 0 }})
                    </span>
                  </dd>
                  <dd v-else class="text-lg font-medium text-dt-text">
                    <div class="animate-pulse h-6 bg-dt-surface-muted rounded"></div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <!-- Transactions -->
        <div class="bg-dt-surface overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <Icon name="heroicons:currency-dollar" class="h-6 w-6 text-dt-text-soft" />
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-dt-text-soft truncate">
                    {{ t('admin.stats.totalTransactions') }}
                  </dt>
                  <dd v-if="!loading.stats" class="text-lg font-medium text-dt-text">
                    {{ stats?.transactions?.total || 0 }}
                  </dd>
                  <dd v-else class="text-lg font-medium text-dt-text">
                    <div class="animate-pulse h-6 bg-dt-surface-muted rounded"></div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Users Management -->
      <div class="bg-dt-surface shadow rounded-lg">
        <div class="px-4 py-5 sm:px-6 border-b border-dt-border">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 class="text-lg leading-6 font-medium text-dt-text">
              {{ t('admin.users.title') }}
            </h2>
            <!-- Search -->
            <div class="relative">
              <input
                v-model="searchQuery"
                type="text"
                :aria-label="t('admin.users.searchPlaceholder')"
                :placeholder="t('admin.users.searchPlaceholder')"
                class="block w-full sm:w-64 pl-10 pr-3 py-2 border border-dt-border rounded-md leading-5 bg-dt-surface-strong placeholder:text-dt-text-soft focus:outline-none focus:ring-2 focus:ring-dt-primary/30 focus:border-dt-primary sm:text-sm text-dt-text"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="heroicons:magnifying-glass" class="h-5 w-5 text-dt-text-soft" />
              </div>
            </div>
          </div>
        </div>

        <!-- Users table -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-dt-border">
            <thead class="bg-dt-surface-strong">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dt-text-soft uppercase tracking-wider">
                  {{ t('admin.users.email') }}
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dt-text-soft uppercase tracking-wider">
                  {{ t('admin.users.name') }}
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dt-text-soft uppercase tracking-wider">
                  {{ t('admin.users.role') }}
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dt-text-soft uppercase tracking-wider">
                  {{ t('admin.users.stats') }}
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dt-text-soft uppercase tracking-wider">
                  {{ t('admin.users.createdAt') }}
                </th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-dt-text-soft uppercase tracking-wider">
                  {{ t('admin.users.actions') }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-dt-surface divide-y divide-dt-border">
              <tr v-if="loading.users" role="status" aria-live="polite">
                <td :colspan="6" class="px-6 py-4 text-center text-dt-text-soft">
                  <div class="flex justify-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-dt-primary" aria-hidden="true"></div>
                  </div>
                  <span class="sr-only">{{ $t('common.loading') || '載入中...' }}</span>
                </td>
              </tr>
              <tr v-else-if="users.length === 0">
                <td :colspan="6" class="px-6 py-4 text-center text-dt-text-soft">
                  {{ t('admin.users.noUsers') }}
                </td>
              </tr>
              <tr v-else v-for="user in users" :key="user.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-dt-text">
                  {{ user.email }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-dt-text">
                  {{ user.name || '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <select
                    :value="user.role"
                    :aria-label="t('admin.users.role')"
                    @change="updateUserRole(user.id, ($event.target as HTMLSelectElement).value as 'USER' | 'ADMIN')"
                    :disabled="user.id === currentUser?.id"
                    class="text-sm rounded-md px-2 py-1 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
                    :class="roleBadgeClass(user.role)"
                    :title="user.id === currentUser?.id ? t('admin.users.cannotModifyOwnRole') : ''"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-dt-text-soft">
                  <span class="mr-2">{{ t('admin.diaries') }}: {{ user._count.diaries }}</span>
                  <span class="mr-2">{{ t('admin.alerts') }}: {{ user._count.alerts }}</span>
                  <span>{{ t('admin.transactions') }}: {{ user._count.transactions }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-dt-text-soft">
                  {{ formatDate(user.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    v-if="user.id !== currentUser?.id"
                    @click="deleteUser(user.id, user.email)"
                    class="text-dt-danger hover:text-dt-danger-strong"
                  >
                    {{ t('admin.users.delete') }}
                  </button>
                  <span v-else class="text-dt-text-soft">
                    {{ t('admin.users.current') }}
                  </span>
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
                @click="fetchUsers(pagination.page - 1)"
                :disabled="pagination.page === 1"
                    :aria-label="t('admin.pagination.previous')"
                class="relative inline-flex items-center px-4 py-2 border border-dt-border text-sm font-medium rounded-md text-dt-text bg-dt-surface hover:bg-dt-surface-strong disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ t('admin.pagination.previous') }}
              </button>
              <button
                @click="fetchUsers(pagination.page + 1)"
                :disabled="pagination.page === pagination.totalPages"
                    :aria-label="t('admin.pagination.next')"
                class="ml-3 relative inline-flex items-center px-4 py-2 border border-dt-border text-sm font-medium rounded-md text-dt-text bg-dt-surface hover:bg-dt-surface-strong disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ t('admin.pagination.next') }}
              </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-dt-text">
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
                <nav aria-label="pagination" class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    @click="fetchUsers(pagination.page - 1)"
                    :disabled="pagination.page === 1"
                    :aria-label="t('admin.pagination.previous')"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-dt-border bg-dt-surface text-sm font-medium text-dt-text-soft hover:bg-dt-surface-strong disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icon name="heroicons:chevron-left" class="h-5 w-5" />
                  </button>
                  <button
                    @click="fetchUsers(pagination.page + 1)"
                    :disabled="pagination.page === pagination.totalPages"
                    :aria-label="t('admin.pagination.next')"
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-dt-border bg-dt-surface text-sm font-medium text-dt-text-soft hover:bg-dt-surface-strong disabled:opacity-50 disabled:cursor-not-allowed"
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
