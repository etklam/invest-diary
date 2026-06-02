<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('alert.title') }}</h1>
    </div>

    <div v-if="pending" class="py-8">
      <AppSkeleton variant="table-row" :count="5" />
    </div>

    <div v-else-if="error" class="bg-red-50 p-4 rounded-md">
      <div class="flex">
        <div class="flex-shrink-0">
          <Icon name="heroicons:x-circle" class="h-5 w-5 text-red-400" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">{{ t('alert.loadFailed') }}</h3>
          <div class="mt-2 text-sm text-red-700">
            {{ error.message }}
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!alerts || alerts.length === 0" class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
      <Icon name="heroicons:bell-slash" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('alert.noAlerts') }}</h3>
      <p class="mt-1 text-sm text-gray-500">{{ t('alert.noAlertsDesc') }}</p>
    </div>

    <div v-else class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
      <ul class="divide-y divide-gray-200 dark:divide-gray-700">
        <li v-for="alert in alerts" :key="alert.id.toString()">
          <div class="px-4 py-4 sm:px-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <Icon name="heroicons:bell" class="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                    {{ alert.message }}
                  </div>
                  <div v-if="alert.diary" class="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Icon name="heroicons:document-text" class="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                    <NuxtLink :to="`/diaries/${alert.diary.id}`" class="hover:underline">
                      {{ t('alert.viewRelatedDiary') }}
                    </NuxtLink>
                  </div>
                </div>
              </div>
              <div class="ml-2 flex-shrink-0 flex">
                <button
                  @click="dismissAlert(alert.id)"
                  class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {{ t('alert.markAsRead') }}
                </button>
              </div>
            </div>
            <div class="mt-2 sm:flex sm:justify-between">
              <div class="sm:flex">
                <p class="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Icon name="heroicons:clock" class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  {{ t('alert.triggerTime') }}：{{ formatDate(alert.triggerAt, { timezone: userTimezone }) }}
                  <span v-if="alert.recurringMode" class="ml-2 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded-full">
                    {{ getRecurringLabel(alert.recurringMode) }} • 第 {{ alert.instanceNumber }} 次
                  </span>
                </p>
              </div>
              <div class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 dark:text-gray-400">
                <Icon name="heroicons:calendar" class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                {{ t('alert.createdAt') }}：{{ formatShortDate(alert.createdAt, userTimezone) }}
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthRecovery } from '~/composables/useAuthRecovery'
import { isAuthSessionError } from '~/lib/auth/session-error'
import { formatDate, formatShortDate } from '~/lib/utils'

const { t } = useI18n()
const { user } = useAuth()
const { runWithAuthRecovery } = useAuthRecovery()

definePageMeta({
  middleware: 'auth'
})

// Use lazy fetch to avoid calling API during SSR before auth check
const { data: alerts, pending, error, refresh } = await useLazyFetch<Array<{
  id: string | bigint
  message: string
  triggerAt: Date | string
  isDismissed: boolean
  recurringMode?: string | null
  instanceNumber?: number | null
  createdAt: Date | string
  diary?: {
    id: string | bigint
    title: string
  }
}>>('/api/alerts')

const toast = useToast()

// Get user's timezone
const userTimezone = computed(() => user.value?.timezone || 'Asia/Taipei')

const dismissAlert = async (id: string | bigint) => {
  try {
    await runWithAuthRecovery(async (): Promise<void> => {
      await $fetch(`/api/alerts/${id}/dismiss` as string, {
        method: 'PUT'
      })
    })
    toast.success(t('alert.markedAsRead'))
    refresh()
  } catch (e: Error | unknown) {
    if (isAuthSessionError(e)) return
    toast.error(t('error.unknown'))
  }
}

const getRecurringLabel = (mode: string) => {
  if (mode === 'WEEK') return '本周'
  if (mode === 'MONTH') return '本月'
  return ''
}
</script>
