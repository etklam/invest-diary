<template>
  <div class="mx-auto max-w-7xl px-4 py-8">
    <header class="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-2">
        <p class="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">
          {{ t('compareDiary.kicker') }}
        </p>
        <h1 class="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          {{ t('compareDiary.title') }}
        </h1>
        <p class="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          {{ t('compareDiary.subtitle') }}
        </p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row">
        <select
          v-model="selectedPartnerId"
          class="min-w-[240px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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

        <NuxtLink
          to="/partners"
          class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-600 dark:hover:text-indigo-300"
        >
          {{ t('compareDiary.managePartners') }}
        </NuxtLink>
      </div>
    </header>

    <div v-if="pending" class="rounded-3xl border border-dashed border-slate-300 px-6 py-20 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {{ t('common.loading') }}
    </div>

    <div v-else-if="error" class="rounded-3xl border border-red-200 bg-red-50 px-6 py-12 text-center dark:border-red-900/50 dark:bg-red-900/10">
      <p class="text-lg font-semibold text-red-700 dark:text-red-300">
        {{ t('compareDiary.loadFailed') }}
      </p>
      <p class="mt-2 text-sm text-red-600/80 dark:text-red-300/80">
        {{ error.message }}
      </p>
    </div>

    <div v-else-if="!acceptedLinks.length" class="rounded-3xl border border-dashed border-slate-300 px-6 py-20 text-center dark:border-slate-700">
      <h2 class="text-2xl font-black text-slate-900 dark:text-white">
        {{ t('compareDiary.noPartnerTitle') }}
      </h2>
      <p class="mx-auto mt-3 max-w-xl text-sm text-slate-500 dark:text-slate-400">
        {{ t('compareDiary.noPartnerDesc') }}
      </p>
      <NuxtLink
        to="/partners"
        class="mt-6 inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
      >
        {{ t('compareDiary.openSettings') }}
      </NuxtLink>
    </div>

    <div v-else class="space-y-6">
      <div class="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <p class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            {{ t('compareDiary.yourSide') }}
          </p>
          <h2 class="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {{ data?.owner.name || data?.owner.email }}
          </h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ data?.owner.email }}
          </p>
        </section>

        <div class="hidden items-center justify-center text-sm font-black uppercase tracking-[0.4em] text-slate-300 lg:flex">
          VS
        </div>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <p class="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">
            {{ t('compareDiary.partnerSide') }}
          </p>
          <h2 class="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {{ data?.partner?.name || data?.partner?.email || t('compareDiary.partnerUnavailable') }}
          </h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ selectedLink?.partner.email }}
          </p>
          <p
            v-if="selectedLink && !selectedLink.partnerSharesDiaries"
            class="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
          >
            {{ t('compareDiary.partnerNotSharing') }}
          </p>
        </section>
      </div>

      <div v-if="!data?.compareDays.length" class="rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center dark:border-slate-700">
        <h2 class="text-2xl font-black text-slate-900 dark:text-white">
          {{ t('compareDiary.noEntriesTitle') }}
        </h2>
        <p class="mx-auto mt-3 max-w-xl text-sm text-slate-500 dark:text-slate-400">
          {{ selectedLink?.partnerSharesDiaries ? t('compareDiary.noEntriesDesc') : t('compareDiary.partnerNotSharing') }}
        </p>
      </div>

      <div v-else class="space-y-6">
        <article
          v-for="day in data?.compareDays"
          :key="day.dateKey"
          class="rounded-[32px] border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/50"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {{ day.dateKey }}
            </h3>
            <span class="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300">
              {{ t('compareDiary.sameDay') }}
            </span>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <section class="rounded-3xl bg-white p-5 dark:bg-slate-900">
              <template v-if="day.ownerDiary">
                <div class="flex flex-wrap items-center gap-2">
                  <h4 class="text-xl font-black text-slate-900 dark:text-white">
                    {{ day.ownerDiary.title }}
                  </h4>
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {{ sourceLabel(day.ownerDiary.createdVia, day.ownerDiary.createdByLabel) }}
                  </span>
                </div>
                <p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {{ day.ownerDiary.content || t('compareDiary.emptyDiaryContent') }}
                </p>
                <div v-if="day.ownerDiary.tags?.length" class="mt-4 flex flex-wrap gap-2">
                  <span
                    v-for="tag in day.ownerDiary.tags"
                    :key="tag"
                    class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                  >
                    #{{ tag }}
                  </span>
                </div>
              </template>
              <div v-else class="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-400">
                {{ t('compareDiary.noDiaryForDay') }}
              </div>
            </section>

            <section class="rounded-3xl bg-white p-5 dark:bg-slate-900">
              <template v-if="day.partnerDiary">
                <div class="flex flex-wrap items-center gap-2">
                  <h4 class="text-xl font-black text-slate-900 dark:text-white">
                    {{ day.partnerDiary.title }}
                  </h4>
                  <span class="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
                    {{ sourceLabel(day.partnerDiary.createdVia, day.partnerDiary.createdByLabel) }}
                  </span>
                </div>
                <p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {{ day.partnerDiary.content || t('compareDiary.emptyDiaryContent') }}
                </p>
                <div v-if="day.partnerDiary.tags?.length" class="mt-4 flex flex-wrap gap-2">
                  <span
                    v-for="tag in day.partnerDiary.tags"
                    :key="tag"
                    class="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200"
                  >
                    #{{ tag }}
                  </span>
                </div>
              </template>
              <div v-else class="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-400">
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
