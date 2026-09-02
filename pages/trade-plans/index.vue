<template>
  <PageContainer width="app" class="space-y-6">
    <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-md">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
            {{ $t('tradePlan.kicker') }}
          </p>
          <h1 class="font-display mt-1 text-3xl tracking-tight text-dt-text">
            {{ $t('tradePlan.title') }}
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-dt-text-muted">
            {{ $t('tradePlan.description') }}
          </p>
        </div>
        <NuxtLink to="/trade-plans/new">
          <BaseButton>
            <Icon name="heroicons:plus" class="h-4 w-4" />
            {{ $t('tradePlan.actions.new') }}
          </BaseButton>
        </NuxtLink>
      </div>
    </section>

    <LedgerCard>
      <div class="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
        <label class="grid gap-1 text-sm">
          <span class="font-semibold text-dt-text">{{ $t('tradePlan.filters.symbol') }}</span>
          <input
            v-model="filters.symbol"
            class="rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-2 text-dt-text focus:border-dt-primary focus:outline-none"
            placeholder="AAPL"
          />
        </label>

        <label class="grid gap-1 text-sm">
          <span class="font-semibold text-dt-text">{{ $t('tradePlan.filters.status') }}</span>
          <select
            v-model="filters.status"
            class="rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-2 text-dt-text focus:border-dt-primary focus:outline-none"
          >
            <option value="">{{ $t('common.all') }}</option>
            <option v-for="status in statusOptions" :key="status" :value="status">
              {{ $t(`tradePlan.status.${status}`) }}
            </option>
          </select>
        </label>

        <BaseButton variant="secondary" :disabled="!hasFilters" @click="clearFilters">
          {{ $t('common.clear') }}
        </BaseButton>
      </div>
    </LedgerCard>

    <section v-if="pending" class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-md">
      <AppSkeleton variant="card" :count="4" />
    </section>

    <section v-else-if="error" class="rounded-dt-md border border-dt-danger/30 bg-dt-surface p-5 text-dt-danger shadow-dt-md">
      <div class="flex items-center gap-3">
        <Icon name="heroicons:x-circle" class="h-5 w-5" />
        <p>{{ $t('tradePlan.loadFailed') }}</p>
      </div>
    </section>

    <section v-else-if="!tradePlans.length" class="rounded-dt-md border border-dt-border bg-dt-surface p-8 text-center shadow-dt-md">
      <Icon name="heroicons:clipboard-document-list" class="mx-auto h-10 w-10 text-dt-text-soft" />
      <h2 class="mt-3 font-display text-2xl tracking-tight text-dt-text">{{ $t('tradePlan.empty.title') }}</h2>
      <p class="mt-2 text-sm text-dt-text-muted">{{ $t('tradePlan.empty.description') }}</p>
    </section>

    <section v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <NuxtLink
        v-for="plan in tradePlans"
        :key="String(plan.id)"
        :to="`/trade-plans/${plan.id}`"
        class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-md transition hover:border-dt-primary/40"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-data text-xs uppercase tracking-[0.12em] text-dt-secondary">{{ plan.symbol }}</p>
            <h2 class="mt-1 text-lg font-bold text-dt-text">{{ plan.setupType || $t('tradePlan.noSetupType') }}</h2>
          </div>
          <StatusBadge :tone="statusTone(plan.status)">{{ $t(`tradePlan.status.${plan.status}`) }}</StatusBadge>
        </div>

        <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-xs font-bold uppercase tracking-[0.12em] text-dt-text-soft">{{ $t('tradePlan.fields.entryZone') }}</dt>
            <dd class="mt-1 text-dt-text">{{ entryLabel(plan) }}</dd>
          </div>
          <div>
            <dt class="text-xs font-bold uppercase tracking-[0.12em] text-dt-text-soft">{{ $t('tradePlan.fields.stopLoss') }}</dt>
            <dd class="mt-1 text-dt-text">{{ valueOrDash(plan.stopLoss) }}</dd>
          </div>
          <div>
            <dt class="text-xs font-bold uppercase tracking-[0.12em] text-dt-text-soft">{{ $t('tradePlan.fields.targetPrice') }}</dt>
            <dd class="mt-1 text-dt-text">{{ valueOrDash(plan.targetPrice) }}</dd>
          </div>
          <div>
            <dt class="text-xs font-bold uppercase tracking-[0.12em] text-dt-text-soft">{{ $t('tradePlan.fields.maxPositionSize') }}</dt>
            <dd class="mt-1 text-dt-text">{{ valueOrDash(plan.maxPositionSize) }}</dd>
          </div>
        </dl>

        <p v-if="plan.diary" class="mt-4 text-xs text-dt-text-muted">
          {{ $t('tradePlan.linkedTo') }} {{ plan.diary.title }}
        </p>
      </NuxtLink>
    </section>
  </PageContainer>
</template>

<script setup lang="ts">
import { TRADE_PLAN_STATUSES, type TradePlan, type TradePlanStatus, type TradePlanListResponse } from '~/types/trade-plan'

definePageMeta({ middleware: 'auth' })

const statusOptions = TRADE_PLAN_STATUSES

const filters = reactive({
  symbol: '',
  status: '',
})

const query = computed(() => ({
  ...(filters.symbol ? { symbol: filters.symbol } : {}),
  ...(filters.status ? { status: filters.status } : {}),
}))

const { data, pending, error } = await useLazyFetch<TradePlanListResponse>('/api/trade-plans', {
  query,
  default: () => ({
    data: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  }),
})

const tradePlans = computed(() => data.value?.data ?? [])
const hasFilters = computed(() => Boolean(filters.symbol || filters.status))

const clearFilters = () => {
  filters.symbol = ''
  filters.status = ''
}

const valueOrDash = (value?: string | number | null) => value ? String(value) : '-'

const entryLabel = (plan: TradePlan) => {
  if (plan.entryZoneLow || plan.entryZoneHigh) {
    return `${valueOrDash(plan.entryZoneLow)} - ${valueOrDash(plan.entryZoneHigh)}`
  }
  return valueOrDash(plan.entryPrice)
}

const statusTone = (status: TradePlanStatus) => {
  if (status === 'active') return 'success'
  if (status === 'closed') return 'neutral'
  if (status === 'cancelled') return 'danger'
  return 'accent'
}
</script>
