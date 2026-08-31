<script setup lang="ts">
import { ref } from 'vue'

interface AdminEtfListItem {
  id: string
  symbol: string
  name: string | null
  priceCount: number
  createdAt: string
}

interface AdminEtfMutationResponse {
  symbol: string
  added?: number
  total?: number
}

interface ApiErrorLike {
  statusCode?: number
  data?: {
    message?: string
  }
}

const { t } = useI18n()
const { formatLocaleDate } = useTimezone()
const toast = useToast()

// State
const loading = ref(false)
const etfs = ref<AdminEtfListItem[]>([])
const showAddForm = ref(false)
const newSymbol = ref('')
const newName = ref('')
const adding = ref(false)
const initializing = ref<string | null>(null)
const skipValidation = ref(false)
const seeding = ref(false)

// Fetch all ETFs
const fetchEtfs = async () => {
  loading.value = true
  try {
    const response = await $fetch<AdminEtfListItem[]>('/api/admin/etf')
    etfs.value = response || []
  } catch (error: unknown) {
    const apiError = error as ApiErrorLike
    if (apiError.statusCode === 403) {
      toast.error(t('tools.etf.admin.adminOnly'))
    } else {
      toast.error(t('tools.etf.admin.fetchFailed'))
    }
  } finally {
    loading.value = false
  }
}

// Add new ETF
const addEtf = async () => {
  if (!newSymbol.value.trim()) {
    toast.error(t('tools.etf.admin.symbolRequired'))
    return
  }

  adding.value = true
  try {
    const response = await $fetch<AdminEtfMutationResponse>('/api/admin/etf', {
      method: 'POST',
      body: {
        symbol: newSymbol.value.trim(),
        name: newName.value.trim() || undefined,
        skipValidation: skipValidation.value,
      },
    })

    toast.success(t('tools.etf.admin.addSuccess', { symbol: response.symbol }))
    newSymbol.value = ''
    newName.value = ''
    skipValidation.value = false
    showAddForm.value = false
    await fetchEtfs()
  } catch (error: unknown) {
    const apiError = error as ApiErrorLike
    if (apiError.statusCode === 429) {
      toast.error(t('tools.etf.admin.rateLimitExceeded'))
      // Show skip validation option after rate limit error
      skipValidation.value = true
    } else if (apiError.statusCode === 403) {
      toast.error(t('tools.etf.admin.adminOnly'))
    } else {
      toast.error(apiError.data?.message || t('tools.etf.admin.addFailed'))
    }
  } finally {
    adding.value = false
  }
}

// Delete ETF
const deleteEtf = async (id: string, symbol: string) => {
  if (!confirm(t('tools.etf.admin.confirmDelete', { symbol }))) {
    return
  }

  try {
    await $fetch(`/api/admin/etf/${id}`, { method: 'DELETE' })
    toast.success(t('tools.etf.admin.deleteSuccess'))
    await fetchEtfs()
  } catch {
    toast.error(t('tools.etf.admin.deleteFailed'))
  }
}

// Initialize historical data
const initializeHistoricalData = async (id: string, symbol: string) => {
  if (!confirm(t('tools.etf.admin.confirmInitialize', { symbol }))) {
    return
  }

  initializing.value = id
  try {
    const response = await $fetch<AdminEtfMutationResponse>(`/api/admin/etf/${id}/initialize`, {
      method: 'POST',
    })

    toast.success(
      t('tools.etf.admin.initializeSuccess', {
        symbol,
        count: response.added,
      })
    )
    await fetchEtfs()
  } catch (error: unknown) {
    const apiError = error as ApiErrorLike
    toast.error(apiError.data?.message || t('tools.etf.admin.initializeFailed'))
  } finally {
    initializing.value = null
  }
}

// Seed common ETFs
const seedCommonEtfs = async () => {
  if (!confirm(t('tools.etf.admin.confirmSeed'))) {
    return
  }

  seeding.value = true
  try {
    const response = await $fetch<AdminEtfMutationResponse>('/api/admin/etf/seed', {
      method: 'POST',
    })

    toast.success(
      t('tools.etf.admin.seedSuccess', {
        added: response.added,
        total: response.total,
      })
    )
    await fetchEtfs()
  } catch (error: unknown) {
    const apiError = error as ApiErrorLike
    if (apiError.statusCode === 403) {
      toast.error(t('tools.etf.admin.adminOnly'))
    } else {
      toast.error(apiError.data?.message || t('tools.etf.admin.seedFailed'))
    }
  } finally {
    seeding.value = false
  }
}

// On mount
onMounted(() => {
  fetchEtfs()
})

// SEO
useHead({
  title: 'ETF 管理 - Admin',
})

definePageMeta({
  middleware: 'admin',
  requiresAuth: true,
})
</script>

<template>
  <PageContainer width="wide" class="py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-dt-text">
          {{ t('tools.etf.admin.title') }}
        </h1>
        <p class="text-dt-text-muted mt-1">
          {{ t('tools.etf.admin.subtitle') }}
        </p>
      </div>
      <div class="flex gap-2">
        <button
          @click="seedCommonEtfs"
          :disabled="seeding"
          class="px-4 py-2 bg-dt-secondary hover:bg-dt-secondary-active disabled:opacity-50 text-white rounded-dt-sm font-medium transition-colors"
        >
          {{ seeding ? t('common.loading') : t('tools.etf.admin.seed') }}
        </button>
        <button
          @click="showAddForm = !showAddForm"
          class="px-4 py-2 bg-dt-primary-solid hover:bg-dt-primary-solid-active text-white rounded-dt-sm font-medium transition-colors"
        >
          {{ showAddForm ? t('common.cancel') : t('tools.etf.admin.addEtf') }}
        </button>
      </div>
    </div>

    <!-- Add ETF Form -->
    <div
      v-if="showAddForm"
      class="bg-dt-surface rounded-dt-md shadow-dt-sm p-6 mb-6"
    >
      <h2 class="text-lg font-semibold text-dt-text mb-4">
        {{ t('tools.etf.admin.addNewEtf') }}
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-dt-text mb-1">
            {{ t('tools.etf.symbol') }}
            <span class="text-dt-danger">*</span>
          </label>
          <input
            v-model="newSymbol"
            type="text"
            :placeholder="t('tools.etf.admin.symbolPlaceholder')"
            class="w-full px-3 py-2 border border-dt-border rounded-dt-sm bg-dt-surface-strong text-dt-text"
            :disabled="adding"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-dt-text mb-1">
            {{ t('tools.etf.name') }}
          </label>
          <input
            v-model="newName"
            type="text"
            :placeholder="t('tools.etf.admin.namePlaceholder')"
            class="w-full px-3 py-2 border border-dt-border rounded-dt-sm bg-dt-surface-strong text-dt-text"
            :disabled="adding"
          />
        </div>
      </div>

      <!-- Skip Validation Option -->
      <div class="mt-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="skipValidation"
            type="checkbox"
            :disabled="adding"
            class="w-4 h-4 text-dt-primary border-dt-border rounded focus:ring-dt-primary"
          />
          <span class="text-sm text-dt-text-muted">
            {{ t('tools.etf.admin.skipValidation') }}
          </span>
        </label>
        <p class="mt-1 text-xs text-dt-text-muted ml-6">
          {{ t('tools.etf.admin.skipValidationHint') }}
        </p>
      </div>

      <div class="mt-4 flex gap-2">
        <button
          @click="addEtf"
          :disabled="adding || !newSymbol.trim()"
          class="px-4 py-2 bg-dt-success hover:opacity-90 disabled:opacity-50 text-white rounded-dt-sm font-medium transition-colors"
        >
          {{ adding ? t('common.loading') : t('tools.etf.admin.addEtf') }}
        </button>
        <button
          @click="showAddForm = false; newSymbol = ''; newName = ''; skipValidation = false"
          class="px-4 py-2 border border-dt-border bg-dt-surface hover:bg-dt-surface-strong text-dt-text rounded-dt-sm font-medium transition-colors"
        >
          {{ t('common.cancel') }}
        </button>
      </div>
      <p class="mt-2 text-sm text-dt-text-muted">
        {{ t('tools.etf.admin.addHint') }}
      </p>
    </div>

    <!-- ETF List -->
    <div class="bg-dt-surface rounded-dt-md shadow-dt-sm overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-dt-text-muted">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="etfs.length === 0" class="p-8 text-center text-dt-text-muted">
        {{ t('tools.etf.admin.noEtfs') }}
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-dt-surface-strong">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-dt-text-muted uppercase">
                {{ t('tools.etf.symbol') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-dt-text-muted uppercase">
                {{ t('tools.etf.name') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-dt-text-muted uppercase">
                {{ t('tools.etf.admin.priceCount') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-dt-text-muted uppercase">
                {{ t('tools.etf.admin.createdAt') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-dt-text-muted uppercase">
                {{ t('tools.etf.fields.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-dt-border">
            <tr
              v-for="etf in etfs"
              :key="etf.id"
              class="hover:bg-dt-surface-strong"
            >
              <td class="px-4 py-3 font-medium text-dt-text">
                {{ etf.symbol }}
              </td>
              <td class="px-4 py-3 text-dt-text-muted">
                {{ etf.name || '-' }}
              </td>
              <td class="px-4 py-3 text-dt-text-muted">
                {{ etf.priceCount }}
              </td>
              <td class="px-4 py-3 text-dt-text-muted">
                {{ formatLocaleDate(etf.createdAt) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button
                    @click="initializeHistoricalData(etf.id, etf.symbol)"
                    :disabled="initializing === etf.id"
                    class="px-3 py-1 bg-dt-info hover:opacity-90 disabled:opacity-50 text-white rounded-dt-sm text-sm transition-colors"
                  >
                    {{ initializing === etf.id ? t('common.loading') : t('tools.etf.admin.initialize') }}
                  </button>
                  <button
                    @click="deleteEtf(etf.id, etf.symbol)"
                    class="px-3 py-1 bg-dt-danger hover:opacity-90 text-white rounded-dt-sm text-sm transition-colors"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Info Box -->
    <div class="mt-6 bg-dt-info/10 rounded-dt-md p-4">
      <h3 class="text-sm font-semibold text-dt-info mb-2">
        {{ t('tools.etf.admin.infoTitle') }}
      </h3>
      <ul class="text-sm text-dt-text space-y-1">
        <li>• {{ t('tools.etf.admin.infoPoint1') }}</li>
        <li>• {{ t('tools.etf.admin.infoPoint2') }}</li>
        <li>• {{ t('tools.etf.admin.infoPoint3') }}</li>
      </ul>
    </div>
  </PageContainer>
</template>
