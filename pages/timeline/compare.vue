<template>
  <div class="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0 space-y-2">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
          {{ t('compareDiary.kicker') }}
        </p>
        <h1 class="font-display text-3xl font-semibold tracking-tight text-dt-text sm:text-4xl">
          {{ t('compareDiary.title') }}
        </h1>
        <p class="max-w-2xl text-sm leading-relaxed text-dt-text-muted">
          {{ t('compareDiary.subtitle') }}
        </p>
      </div>

      <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <select
          v-model="selectedPartnerId"
          class="min-h-11 w-full rounded-dt-sm border border-dt-border bg-dt-surface px-4 text-sm font-semibold text-dt-text outline-none focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20 sm:min-w-[240px]"
        >
          <option value="">
            {{ t('compareDiary.selectPartner') }}
          </option>
          <option
            v-for="link in acceptedLinks"
            :key="link.id"
            :value="link.partner.id"
          >
            {{ link.partner.name || link.partner.email }}
          </option>
        </select>

        <NuxtLink to="/partners" class="inline-flex">
          <BaseButton variant="secondary" class="w-full sm:w-auto">
            {{ t('compareDiary.managePartners') }}
          </BaseButton>
        </NuxtLink>
      </div>
    </header>

    <div
      v-if="pending"
      class="rounded-dt-md border border-dashed border-dt-border px-6 py-20 text-center text-dt-text-muted"
    >
      {{ t('common.loading') }}
    </div>

    <div
      v-else-if="error"
      class="rounded-dt-md border border-dt-danger/30 bg-dt-surface px-6 py-12 text-center shadow-dt-sm"
    >
      <p class="text-lg font-semibold text-dt-danger">
        {{ t('compareDiary.loadFailed') }}
      </p>
      <p class="mt-2 text-sm text-dt-text-muted">
        {{ error.message }}
      </p>
    </div>

    <div
      v-else-if="!acceptedLinks.length"
      class="rounded-dt-md border border-dashed border-dt-border bg-dt-surface px-6 py-16 text-center shadow-dt-sm"
    >
      <h2 class="font-display text-2xl font-semibold text-dt-text">
        {{ t('compareDiary.noPartnerTitle') }}
      </h2>
      <p class="mx-auto mt-3 max-w-xl text-sm text-dt-text-muted">
        {{ t('compareDiary.noPartnerDesc') }}
      </p>
      <NuxtLink to="/partners" class="mt-6 inline-flex">
        <BaseButton variant="primary">
          {{ t('compareDiary.openSettings') }}
        </BaseButton>
      </NuxtLink>
    </div>

    <div v-else class="space-y-6">
      <div class="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-sm">
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-text-soft">
            {{ t('compareDiary.yourSide') }}
          </p>
          <h2 class="mt-2 text-xl font-semibold text-dt-text sm:text-2xl">
            {{ data?.owner.name || data?.owner.email }}
          </h2>
          <p class="mt-1 text-sm text-dt-text-muted">
            {{ data?.owner.email }}
          </p>
        </section>

        <div class="hidden items-center justify-center text-xs font-bold uppercase tracking-[0.3em] text-dt-text-soft lg:flex">
          VS
        </div>

        <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-sm">
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
            {{ t('compareDiary.partnerSide') }}
          </p>
          <h2 class="mt-2 text-xl font-semibold text-dt-text sm:text-2xl">
            {{ data?.partner?.name || data?.partner?.email || t('compareDiary.partnerUnavailable') }}
          </h2>
          <p class="mt-1 text-sm text-dt-text-muted">
            {{ selectedLink?.partner.email }}
          </p>
          <p
            v-if="selectedLink && !selectedLink.partnerSharesDiaries"
            class="mt-3 rounded-dt-sm border border-dt-warning/30 px-3 py-2 text-xs font-medium text-dt-warning"
            style="background: color-mix(in srgb, var(--color-warning) 10%, var(--color-surface));"
          >
            {{ t('compareDiary.partnerNotSharing') }}
          </p>
        </section>
      </div>

      <div
        v-if="!data?.compareDays.length"
        class="rounded-dt-md border border-dashed border-dt-border bg-dt-surface px-6 py-16 text-center shadow-dt-sm"
      >
        <h2 class="font-display text-2xl font-semibold text-dt-text">
          {{ t('compareDiary.noEntriesTitle') }}
        </h2>
        <p class="mx-auto mt-3 max-w-xl text-sm text-dt-text-muted">
          {{ selectedLink?.partnerSharesDiaries ? t('compareDiary.noEntriesDesc') : t('compareDiary.partnerNotSharing') }}
        </p>
      </div>

      <div v-else class="space-y-4">
        <article
          v-for="day in data?.compareDays"
          :key="day.dateKey"
          class="rounded-dt-md border border-dt-border bg-dt-surface-strong/60 p-4 shadow-dt-sm sm:p-5"
        >
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-data text-sm font-semibold text-dt-text-muted">
              {{ day.dateKey }}
            </h3>
            <StatusBadge tone="neutral">
              {{ t('compareDiary.sameDay') }}
            </StatusBadge>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <section class="rounded-dt-sm border border-dt-border bg-dt-surface p-4 sm:p-5">
              <template v-if="day.ownerDiary">
                <div class="flex flex-wrap items-center gap-2">
                  <h4 class="text-lg font-semibold text-dt-text">
                    {{ day.ownerDiary.title }}
                  </h4>
                  <StatusBadge tone="neutral">
                    {{ sourceLabel(day.ownerDiary.createdVia, day.ownerDiary.createdByLabel) }}
                  </StatusBadge>
                </div>
                <p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-dt-text-muted">
                  {{ day.ownerDiary.content || t('compareDiary.emptyDiaryContent') }}
                </p>
                <div v-if="day.ownerDiary.tags?.length" class="mt-4 flex flex-wrap gap-2">
                  <span
                    v-for="tag in day.ownerDiary.tags"
                    :key="tag"
                    class="rounded-full bg-dt-surface-strong px-2 py-1 text-[11px] font-semibold text-dt-text-soft"
                  >
                    #{{ tag }}
                  </span>
                </div>
              </template>
              <div v-else class="rounded-dt-sm border border-dashed border-dt-border px-4 py-10 text-center text-sm text-dt-text-soft">
                {{ t('compareDiary.noDiaryForDay') }}
              </div>
            </section>

            <section class="rounded-dt-sm border border-dt-border bg-dt-surface p-4 sm:p-5">
              <template v-if="day.partnerDiary">
                <div class="flex flex-wrap items-center gap-2">
                  <h4 class="text-lg font-semibold text-dt-text">
                    {{ day.partnerDiary.title }}
                  </h4>
                  <StatusBadge tone="accent">
                    {{ sourceLabel(day.partnerDiary.createdVia, day.partnerDiary.createdByLabel) }}
                  </StatusBadge>
                </div>
                <p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-dt-text-muted">
                  {{ day.partnerDiary.content || t('compareDiary.emptyDiaryContent') }}
                </p>
                <div v-if="day.partnerDiary.tags?.length" class="mt-4 flex flex-wrap gap-2">
                  <span
                    v-for="tag in day.partnerDiary.tags"
                    :key="tag"
                    class="rounded-full bg-dt-surface-strong px-2 py-1 text-[11px] font-semibold text-dt-primary"
                  >
                    #{{ tag }}
                  </span>
                </div>
              </template>
              <div v-else class="rounded-dt-sm border border-dashed border-dt-border px-4 py-10 text-center text-sm text-dt-text-soft">
                {{ t('compareDiary.noDiaryForDay') }}
              </div>
            </section>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PartnerCompareResponse } from '~/types/partner'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const selectedPartnerId = ref(typeof route.query.partnerId === 'string' ? route.query.partnerId : '')

watch(() => route.query.partnerId, (partnerId) => {
  selectedPartnerId.value = typeof partnerId === 'string' ? partnerId : ''
})

const query = computed(() => ({
  partnerId: selectedPartnerId.value || undefined,
  limit: 20,
}))

const { data, pending, error, refresh } = await useFetch<PartnerCompareResponse>('/api/partners/compare', {
  query,
  watch: [query],
})

const acceptedLinks = computed(() => data.value?.links.filter(link => link.status === 'connected') ?? [])
const selectedLink = computed(() => {
  const candidateId = data.value?.selectedPartnerId || selectedPartnerId.value
  if (!candidateId) return null
  return data.value?.links.find(link => link.partner.id === candidateId) ?? null
})

watch(selectedPartnerId, async (value) => {
  const currentPartnerId = typeof route.query.partnerId === 'string' ? route.query.partnerId : ''
  if ((value || '') === currentPartnerId) return

  await router.replace({
    query: {
      ...route.query,
      ...(value ? { partnerId: value } : { partnerId: undefined }),
    },
  })
  refresh()
})

const sourceLabel = (createdVia?: string | null, createdByLabel?: string | null) => {
  if (createdVia === 'API_KEY') {
    return createdByLabel || t('compareDiary.apiSource')
  }
  return t('compareDiary.webSource')
}

definePageMeta({
  middleware: 'auth',
})
</script>
