<template>
  <LedgerCard :title="title" :description="description">
    <div class="mb-4 flex items-center justify-between">
      <StatusBadge :tone="tone">{{ items.length }}</StatusBadge>
    </div>

    <div v-if="items.length === 0" class="rounded-dt-sm border border-dashed border-dt-border bg-dt-surface-strong p-5 text-sm text-dt-text-muted">
      {{ emptyText }}
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="item in items"
        :key="String(item.id)"
        class="rounded-dt-sm border border-dt-border bg-dt-surface-strong p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-data text-xs uppercase tracking-[0.12em] text-dt-secondary">
              {{ formatDate(item.reviewDueAt || item.date) }}
            </p>
            <p v-if="item.targetType === 'thesis'" class="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-dt-primary">
              {{ $t('review.queue.thesisType') }}<span v-if="item.symbol"> · {{ item.symbol }}</span>
            </p>
            <h3 class="mt-1 line-clamp-2 text-lg font-bold text-dt-text">
              {{ item.title }}
            </h3>
          </div>
          <StatusBadge :tone="completed ? 'success' : tone">
            {{ completed ? completedLabel(item) : statusLabel(item.reviewStatus) }}
          </StatusBadge>
        </div>

        <dl class="mt-4 space-y-3 text-sm">
          <div>
            <dt class="text-xs font-bold uppercase tracking-[0.12em] text-dt-text-soft">
              {{ $t('review.fields.reviewDue') }}
            </dt>
            <dd class="mt-1 text-dt-text">{{ formatDate(item.reviewDueAt) }}</dd>
          </div>
          <div v-if="item.targetType !== 'thesis'">
            <dt class="text-xs font-bold uppercase tracking-[0.12em] text-dt-text-soft">
              {{ $t('diary.diaryDate') }}
            </dt>
            <dd class="mt-1 text-dt-text">{{ formatDate(item.date) }}</dd>
          </div>
          <div v-if="item.targetType !== 'thesis'">
            <dt class="text-xs font-bold uppercase tracking-[0.12em] text-dt-text-soft">
              {{ $t('review.fields.thesis') }}
            </dt>
            <dd class="mt-1 line-clamp-3 text-dt-text-muted">{{ excerpt(item.thesis) }}</dd>
          </div>
          <div v-if="item.targetType !== 'thesis'">
            <dt class="text-xs font-bold uppercase tracking-[0.12em] text-dt-text-soft">
              {{ $t('review.fields.risk') }}
            </dt>
            <dd class="mt-1 line-clamp-3 text-dt-text-muted">{{ excerpt(item.risk) }}</dd>
          </div>
          <div v-else>
            <dt class="text-xs font-bold uppercase tracking-[0.12em] text-dt-text-soft">
              {{ $t('review.queue.latestOutcome') }}
            </dt>
            <dd class="mt-1 text-dt-text-muted">
              {{ item.latestReviewOutcome ? $t(`review.outcomes.${item.latestReviewOutcome}`) : $t('common.noData') }}
              <span v-if="item.portfolioDecision"> · {{ item.portfolioDecision }}</span>
            </dd>
          </div>
        </dl>

        <div class="mt-4 flex flex-wrap gap-2 border-t border-dt-border pt-4">
          <NuxtLink :to="item.targetType === 'thesis' ? `/stocks/${encodeURIComponent(item.symbol || '')}?tab=thesis&review=${item.thesisId || item.id}` : `/diaries/${item.id}/review`">
            <BaseButton :variant="completed ? 'secondary' : 'primary'">
              {{ completed ? $t('review.viewReview') : $t('review.startReview') }}
            </BaseButton>
          </NuxtLink>
        </div>
      </article>
    </div>
  </LedgerCard>
</template>

<script setup lang="ts">
import type { SerializedId } from '~/types/common'

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
  reviewOutcome?: string | null
  targetType?: 'diary' | 'thesis'
  thesisId?: SerializedId
  symbol?: string | null
  thesisStatus?: string | null
  latestReviewOutcome?: string | null
  portfolioDecision?: string | null
}

defineProps<{
  title: string
  description: string
  tone: 'neutral' | 'success' | 'danger' | 'warning' | 'accent'
  items: DiaryReviewItem[]
  emptyText: string
  completed?: boolean
}>()

const { formatLocaleDate } = useTimezone()
const { t } = useI18n()

const formatDate = (value?: string | null) => {
  if (!value) return t('common.noData')
  return formatLocaleDate(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const excerpt = (value?: string | null) => {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  return normalized || t('common.noData')
}

const statusLabel = (status: ReviewStatus) => {
  if (status === 'reviewed') return t('review.statusReviewed')
  if (status === 'pending') return t('review.statusPending')
  return t('review.statusNone')
}

const completedLabel = (item: DiaryReviewItem) => {
  if (!item.reviewOutcome) return t('review.legacyBadge')
  return t(`review.outcomes.${item.reviewOutcome}`)
}
</script>
