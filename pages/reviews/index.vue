<template>
  <div class="mx-auto max-w-[1180px] space-y-6">
    <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-md">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
            {{ $t('review.queue.kicker') }}
          </p>
          <h1 class="font-display mt-1 text-3xl tracking-tight text-dt-text">
            {{ $t('review.queue.title') }}
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-dt-text-muted">
            {{ $t('review.queue.description') }}
          </p>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="rounded-dt-sm border border-dt-border bg-dt-surface-strong px-4 py-3">
            <p class="font-data text-2xl font-bold text-dt-text">{{ totalOpenReviews }}</p>
            <p class="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
              {{ $t('review.queue.openCount') }}
            </p>
          </div>
          <div class="rounded-dt-sm border border-dt-border bg-dt-surface-strong px-4 py-3">
            <p class="font-data text-2xl font-bold text-dt-danger">{{ reviewGroups.overdue.length }}</p>
            <p class="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
              {{ $t('review.queue.overdueCount') }}
            </p>
          </div>
          <div class="rounded-dt-sm border border-dt-border bg-dt-surface-strong px-4 py-3">
            <p class="font-data text-2xl font-bold text-dt-secondary">{{ reviewGroups.today.length }}</p>
            <p class="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
              {{ $t('review.queue.todayCount') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section v-if="pending" class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-md">
      <AppSkeleton variant="card" :count="4" />
    </section>

    <section v-else-if="error" class="rounded-dt-md border border-dt-danger/30 bg-dt-surface p-5 text-dt-danger shadow-dt-md">
      <div class="flex flex-wrap items-center gap-3">
        <Icon name="heroicons:x-circle" class="h-5 w-5" />
        <div>
          <h2 class="font-display text-xl tracking-tight text-dt-text">{{ $t('review.queue.loadFailed') }}</h2>
          <p class="mt-1 text-sm text-dt-text-muted">{{ error.message }}</p>
        </div>
        <BaseButton variant="secondary" class="ml-auto" @click="refresh()">
          {{ $t('common.retry') }}
        </BaseButton>
      </div>
    </section>

    <template v-else>
      <ReviewSection
        :title="$t('review.queue.sections.unscheduled')"
        :description="$t('review.queue.sections.unscheduledDesc')"
        tone="accent"
        :items="reviewGroups.unscheduled"
        :empty-text="$t('review.queue.empty.unscheduled')"
        @mark-reviewed="markReviewed"
      />

      <ReviewSection
        :title="$t('review.queue.sections.overdue')"
        :description="$t('review.queue.sections.overdueDesc')"
        tone="danger"
        :items="reviewGroups.overdue"
        :empty-text="$t('review.queue.empty.overdue')"
        @mark-reviewed="markReviewed"
      />

      <ReviewSection
        :title="$t('review.queue.sections.today')"
        :description="$t('review.queue.sections.todayDesc')"
        tone="warning"
        :items="reviewGroups.today"
        :empty-text="$t('review.queue.empty.today')"
        @mark-reviewed="markReviewed"
      />

      <ReviewSection
        :title="$t('review.queue.sections.upcoming')"
        :description="$t('review.queue.sections.upcomingDesc')"
        tone="accent"
        :items="reviewGroups.upcoming"
        :empty-text="$t('review.queue.empty.upcoming')"
        @mark-reviewed="markReviewed"
      />

      <ReviewSection
        :title="$t('review.queue.sections.completed')"
        :description="$t('review.queue.sections.completedDesc')"
        tone="success"
        :items="reviewGroups.completed"
        :empty-text="$t('review.queue.empty.completed')"
        completed
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { SerializedId } from '~/types/common'
import { isAuthSessionError } from '~/lib/auth/session-error'

definePageMeta({
  middleware: 'auth',
})

type ReviewStatus = 'none' | 'pending' | 'reviewed'

interface DiaryReviewItem {
  id: SerializedId
  title: string
  date: string
  thesis?: string | null
  risk?: string | null
  reviewDueAt?: string | null
  reviewStatus: ReviewStatus
  reviewedAt?: string | null
}

interface ReviewGroups {
  unscheduled: DiaryReviewItem[]
  overdue: DiaryReviewItem[]
  today: DiaryReviewItem[]
  upcoming: DiaryReviewItem[]
  completed: DiaryReviewItem[]
}

const emptyGroups = (): ReviewGroups => ({
  unscheduled: [],
  overdue: [],
  today: [],
  upcoming: [],
  completed: [],
})

const { t } = useI18n()
const toast = useToast()
const { runWithAuthRecovery } = useAuthRecovery()

const { data, pending, error, refresh } = await useLazyFetch<ReviewGroups>('/api/reviews', {
  default: emptyGroups,
})

const reviewGroups = computed(() => data.value ?? emptyGroups())
const totalOpenReviews = computed(() =>
  reviewGroups.value.unscheduled.length + reviewGroups.value.overdue.length + reviewGroups.value.today.length + reviewGroups.value.upcoming.length
)

const markReviewed = async (item: DiaryReviewItem) => {
  try {
    await runWithAuthRecovery(async () => {
      await $fetch(`/api/diaries/${item.id}/review`, {
        method: 'PATCH',
        body: {
          reviewStatus: 'reviewed',
          reviewedAt: new Date().toISOString(),
        },
      })
    })
    toast.success(t('review.queue.markedReviewed'))
    await refresh()
  } catch (err) {
    if (isAuthSessionError(err)) return
    toast.error(t('review.queue.markReviewedFailed'))
  }
}
</script>
