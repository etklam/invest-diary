<template>
  <div class="max-w-[1200px] mx-auto pb-24">
    <!-- Header Section -->
    <header class="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-1">
        <p class="text-xs font-semibold uppercase tracking-widest text-copy-muted">
          {{ t('compareDiary.kicker') }}
        </p>
        <h1 class="text-3xl font-semibold tracking-tight text-copy">
          {{ t('compareDiary.title') }}
        </h1>
        <p class="text-copy-secondary text-sm max-w-xl">
          {{ t('compareDiary.subtitle') }}
        </p>
      </div>

      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <BaseSelect
          v-model="selectedPartnerId"
          :options="partnerOptions"
          :placeholder="t('compareDiary.selectPartner')"
          class="min-w-[240px]"
        />
        <NuxtLink to="/settings">
          <BaseButton variant="secondary" size="md">
            {{ t('compareDiary.managePartners') }}
          </BaseButton>
        </NuxtLink>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="pending" class="space-y-6">
      <div class="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <BaseSkeleton variant="card" />
        <div class="hidden lg:block" />
        <BaseSkeleton variant="card" />
      </div>
      <BaseSkeleton variant="card" />
      <BaseSkeleton variant="card" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="mb-12">
      <BaseAlert variant="error">
        <h3 class="font-semibold">{{ t('compareDiary.loadFailed') }}</h3>
        <p class="mt-1 opacity-90">{{ error.message }}</p>
      </BaseAlert>
    </div>

    <!-- No Partners State -->
    <div v-else-if="!acceptedLinks.length" class="py-24 text-center border border-dashed border-line">
      <div class="mb-6 flex justify-center">
        <Icon name="lucide:users" class="h-12 w-12 text-copy-muted opacity-20" />
      </div>
      <h2 class="text-xl font-semibold text-copy">
        {{ t('compareDiary.noPartnerTitle') }}
      </h2>
      <p class="mx-auto mt-3 max-w-xl text-sm text-copy-secondary">
        {{ t('compareDiary.noPartnerDesc') }}
      </p>
      <div class="mt-8">
        <NuxtLink to="/settings">
          <BaseButton variant="primary" size="md">
            {{ t('compareDiary.openSettings') }}
          </BaseButton>
        </NuxtLink>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-6">
      <!-- User Cards -->
      <div class="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <section class="border border-line bg-surface p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-copy-muted">
            {{ t('compareDiary.yourSide') }}
          </p>
          <h2 class="mt-2 text-xl font-semibold text-copy">
            {{ data?.owner.name || data?.owner.email }}
          </h2>
          <p class="mt-1 text-sm text-copy-secondary">
            {{ data?.owner.email }}
          </p>
        </section>

        <div class="hidden items-center justify-center text-xs font-semibold uppercase tracking-widest text-copy-muted lg:flex">
          VS
        </div>

        <section class="border border-line bg-surface p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-accent">
            {{ t('compareDiary.partnerSide') }}
          </p>
          <h2 class="mt-2 text-xl font-semibold text-copy">
            {{ data?.partner?.name || data?.partner?.email || t('compareDiary.partnerUnavailable') }}
          </h2>
          <p class="mt-1 text-sm text-copy-secondary">
            {{ selectedLink?.partner.email }}
          </p>
          <div
            v-if="selectedLink && !selectedLink.partnerSharesDiaries"
            class="mt-3 px-3 py-2 bg-semantic-warning/10 border border-semantic-warning/30"
          >
            <p class="text-xs font-medium text-semantic-warning">
              {{ t('compareDiary.partnerNotSharing') }}
            </p>
          </div>
        </section>
      </div>

      <!-- No Entries State -->
      <div v-if="!data?.compareDays.length" class="py-20 text-center border border-dashed border-line">
        <div class="mb-6 flex justify-center">
          <Icon name="lucide:calendar-x" class="h-12 w-12 text-copy-muted opacity-20" />
        </div>
        <h2 class="text-xl font-semibold text-copy">
          {{ t('compareDiary.noEntriesTitle') }}
        </h2>
        <p class="mx-auto mt-3 max-w-xl text-sm text-copy-secondary">
          {{ selectedLink?.partnerSharesDiaries ? t('compareDiary.noEntriesDesc') : t('compareDiary.partnerNotSharing') }}
        </p>
      </div>

      <!-- Compare Days -->
      <div v-else class="space-y-6">
        <article
          v-for="day in data?.compareDays"
          :key="day.dateKey"
          class="border border-line bg-surface-alt"
        >
          <!-- Day Header -->
          <div class="px-5 py-4 border-b border-line flex items-center justify-between">
            <h3 class="text-xs font-semibold uppercase tracking-widest text-copy-muted">
              {{ day.dateKey }}
            </h3>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-copy-muted bg-surface px-2.5 py-1 border border-line">
              {{ t('compareDiary.sameDay') }}
            </span>
          </div>

          <!-- Side-by-side Content -->
          <div class="grid gap-px lg:grid-cols-2 bg-line">
            <!-- Owner Diary -->
            <section class="bg-surface p-5">
              <template v-if="day.ownerDiary">
                <div class="flex flex-wrap items-center gap-2 mb-3">
                  <h4 class="text-base font-semibold text-copy">
                    {{ day.ownerDiary.title }}
                  </h4>
                  <BaseBadge variant="default">
                    {{ sourceLabel(day.ownerDiary.createdVia, day.ownerDiary.createdByLabel) }}
                  </BaseBadge>
                </div>
                <p class="whitespace-pre-wrap text-sm leading-7 text-copy-secondary">
                  {{ day.ownerDiary.content || t('compareDiary.emptyDiaryContent') }}
                </p>
                <div v-if="day.ownerDiary.tags?.length" class="mt-4 flex flex-wrap gap-2">
                  <span
                    v-for="tag in day.ownerDiary.tags"
                    :key="tag"
                    class="text-[10px] text-copy-muted font-medium uppercase"
                  >
                    #{{ tag }}
                  </span>
                </div>
              </template>
              <div v-else class="py-10 text-center border border-dashed border-line">
                <p class="text-sm text-copy-muted">{{ t('compareDiary.noDiaryForDay') }}</p>
              </div>
            </section>

            <!-- Partner Diary -->
            <section class="bg-surface p-5">
              <template v-if="day.partnerDiary">
                <div class="flex flex-wrap items-center gap-2 mb-3">
                  <h4 class="text-base font-semibold text-copy">
                    {{ day.partnerDiary.title }}
                  </h4>
                  <BaseBadge variant="info">
                    {{ sourceLabel(day.partnerDiary.createdVia, day.partnerDiary.createdByLabel) }}
                  </BaseBadge>
                </div>
                <p class="whitespace-pre-wrap text-sm leading-7 text-copy-secondary">
                  {{ day.partnerDiary.content || t('compareDiary.emptyDiaryContent') }}
                </p>
                <div v-if="day.partnerDiary.tags?.length" class="mt-4 flex flex-wrap gap-2">
                  <span
                    v-for="tag in day.partnerDiary.tags"
                    :key="tag"
                    class="text-[10px] text-copy-muted font-medium uppercase"
                  >
                    #{{ tag }}
                  </span>
                </div>
              </template>
              <div v-else class="py-10 text-center border border-dashed border-line">
                <p class="text-sm text-copy-muted">{{ t('compareDiary.noDiaryForDay') }}</p>
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

const acceptedLinks = computed(() => data.value?.links.filter(link => !link.pendingIncoming && !link.pendingOutgoing) ?? [])

const partnerOptions = computed(() =>
  acceptedLinks.value.map(link => ({
    label: link.partner.name || link.partner.email,
    value: link.partner.id,
  }))
)

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
