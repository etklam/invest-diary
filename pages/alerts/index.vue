<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold text-copy">{{ t('alert.title') }}</h1>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="pending" class="space-y-4">
      <div v-for="i in 3" :key="i" class="border border-line bg-surface p-4">
        <div class="flex items-center gap-4">
          <BaseSkeleton variant="circle" class="h-10 w-10" />
          <div class="flex-1 space-y-2">
            <BaseSkeleton variant="text" class="w-3/4" />
            <BaseSkeleton variant="text" class="w-1/2" />
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <BaseAlert v-else-if="error" variant="error">
      <p class="font-medium">{{ t('alert.loadFailed') }}</p>
      <p class="mt-1 text-sm">{{ error.message }}</p>
    </BaseAlert>

    <!-- Empty -->
    <BaseEmpty
      v-else-if="!alerts || alerts.length === 0"
      icon="lucide:bell-off"
      :title="t('alert.noAlerts')"
      :description="t('alert.noAlertsDesc')"
    />

    <!-- Alert List -->
    <div v-else class="border border-line bg-surface overflow-hidden">
      <ul class="divide-y divide-line">
        <li v-for="alert in alerts" :key="alert.id.toString()">
          <div class="px-4 py-4 sm:px-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <Icon name="lucide:bell" class="h-5 w-5 text-accent" />
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-accent truncate">
                    {{ alert.message }}
                  </div>
                  <div v-if="alert.diary" class="flex items-center text-sm text-copy-muted mt-0.5">
                    <Icon name="lucide:file-text" class="flex-shrink-0 mr-1.5 h-4 w-4" />
                    <NuxtLink :to="`/diaries/${alert.diary.id}`" class="hover:text-accent transition-colors duration-fast">
                      {{ t('alert.viewRelatedDiary') }}
                    </NuxtLink>
                  </div>
                </div>
              </div>
              <div class="ml-2 flex-shrink-0">
                <BaseButton
                  size="sm"
                  @click="dismissAlert(alert.id)"
                >
                  {{ t('alert.markAsRead') }}
                </BaseButton>
              </div>
            </div>
            <div class="mt-2 sm:flex sm:justify-between">
              <div class="sm:flex">
                <p class="flex items-center text-sm text-copy-muted">
                  <Icon name="lucide:clock" class="flex-shrink-0 mr-1.5 h-4 w-4" />
                  {{ t('alert.triggerTime') }}：{{ formatDate(alert.triggerAt, userTimezone) }}
                  <BaseBadge v-if="alert.recurringMode" variant="info" class="ml-2">
                    {{ getRecurringLabel(alert.recurringMode) }} • 第 {{ alert.instanceNumber }} 次
                  </BaseBadge>
                </p>
              </div>
              <div class="mt-2 flex items-center text-sm text-copy-muted sm:mt-0">
                <Icon name="lucide:calendar" class="flex-shrink-0 mr-1.5 h-4 w-4" />
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
