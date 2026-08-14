<template>
  <div class="space-y-6 pb-4">
    <header class="flex items-center justify-between gap-3">
      <h1 class="font-display text-2xl font-semibold tracking-tight text-dt-text sm:text-3xl">
        {{ t('alert.title') }}
      </h1>
    </header>

    <div v-if="pending" class="py-8">
      <AppSkeleton variant="table-row" :count="5" />
    </div>

    <div
      v-else-if="error"
      class="rounded-dt-md border border-dt-danger/30 bg-dt-surface p-4 shadow-dt-sm"
    >
      <div class="flex gap-3">
        <Icon name="heroicons:x-circle" class="h-5 w-5 shrink-0 text-dt-danger" />
        <div class="min-w-0">
          <h3 class="text-sm font-semibold text-dt-text">{{ t('alert.loadFailed') }}</h3>
          <p class="mt-1 text-sm text-dt-text-muted">
            {{ error.message }}
          </p>
          <BaseButton variant="secondary" class="mt-3" @click="refresh()">
            <Icon name="heroicons:arrow-path" class="h-4 w-4" />
            {{ t('common.retry') }}
          </BaseButton>
        </div>
      </div>
    </div>

    <LedgerCard v-else-if="!alerts || alerts.length === 0">
      <div class="px-2 py-10 text-center">
        <Icon name="heroicons:bell-slash" class="mx-auto h-10 w-10 text-dt-text-soft" />
        <h3 class="mt-3 text-sm font-semibold text-dt-text">{{ t('alert.noAlerts') }}</h3>
        <p class="mt-1 text-sm text-dt-text-muted">{{ t('alert.noAlertsDesc') }}</p>
      </div>
    </LedgerCard>

    <section v-else class="overflow-hidden rounded-dt-md border border-dt-border bg-dt-surface shadow-dt-sm">
      <ul class="divide-y divide-dt-border">
        <li
          v-for="alert in alerts"
          :key="alert.id.toString()"
          class="px-4 py-4 sm:px-5"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex min-w-0 items-start gap-3">
              <div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-dt-sm border border-dt-border bg-dt-surface-strong">
                <Icon name="heroicons:bell" class="h-5 w-5 text-dt-primary" />
              </div>
              <div class="min-w-0 space-y-1.5">
                <p class="text-sm font-semibold leading-snug text-dt-text">
                  {{ alert.message }}
                </p>
                <NuxtLink
                  v-if="alert.diary"
                  :to="`/diaries/${alert.diary.id}`"
                  class="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-dt-primary hover:underline"
                >
                  <Icon name="heroicons:document-text" class="h-4 w-4" />
                  {{ t('alert.viewRelatedDiary') }}
                </NuxtLink>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dt-text-muted">
                  <span class="inline-flex items-center gap-1 font-data">
                    <Icon name="heroicons:clock" class="h-3.5 w-3.5 text-dt-text-soft" />
                    {{ t('alert.triggerTime') }}：{{ formatDate(alert.triggerAt, { timezone: userTimezone }) }}
                  </span>
                  <StatusBadge v-if="alert.recurringMode" tone="accent">
                    {{ getRecurringLabel(alert.recurringMode) }} · #{{ alert.instanceNumber }}
                  </StatusBadge>
                </div>
                <p class="font-data text-xs text-dt-text-soft">
                  {{ t('alert.createdAt') }}：{{ formatShortDate(alert.createdAt, userTimezone) }}
                </p>
              </div>
            </div>

            <BaseButton
              variant="primary"
              class="w-full shrink-0 sm:w-auto"
              @click="dismissAlert(alert.id)"
            >
              {{ t('alert.markAsRead') }}
            </BaseButton>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAuthRecovery } from '~/composables/useAuthRecovery'
import { isAuthSessionError } from '~/lib/auth/session-error'
import { formatDate, formatShortDate } from '~/lib/dates'
import type { AlertApiResponse } from '~/types/alert'

const { t } = useI18n()
const { user } = useAuth()
const { runWithAuthRecovery } = useAuthRecovery()

definePageMeta({
  middleware: 'auth'
})

// Use lazy fetch to avoid calling API during SSR before auth check
const { data: alerts, pending, error, refresh } = await useLazyFetch<AlertApiResponse[]>('/api/alerts')

const toast = useToast()

// Get user's timezone
const userTimezone = computed(() => user.value?.timezone || 'Asia/Taipei')

const dismissAlert = async (id: AlertApiResponse['id']) => {
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
