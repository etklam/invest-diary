<template>
  <div class="max-w-[800px] mx-auto pb-24">
    <!-- Header Section -->
    <header class="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-1">
        <h1 class="text-3xl font-semibold tracking-tight text-copy">
          {{ t('timeline.title') }}
        </h1>
        <p class="text-copy-secondary text-sm">
          {{ t('timeline.subtitle') }}
        </p>
      </div>
      
      <div class="flex items-center gap-3">
        <BaseButton variant="secondary" size="md" @click="navigateTo('/timeline/compare')">
          <Icon name="lucide:layout-grid" class="mr-2 h-4 w-4" />
          {{ t('compareDiary.title') }}
        </BaseButton>
        <BaseButton variant="primary" size="md" @click="navigateTo('/diaries/new')">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          {{ t('diary.newDiary') }}
        </BaseButton>
      </div>
    </header>

    <!-- Filters Section -->
    <div class="mb-12 p-4 bg-surface-alt border border-line">
      <div class="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
        <BaseInput
          v-model="filters.dateFrom"
          type="date"
          :label="t('diary.dateFrom')"
          id="date-from"
        />
        <BaseInput
          v-model="filters.dateTo"
          type="date"
          :label="t('diary.dateTo')"
          id="date-to"
        />
        <BaseButton variant="ghost" size="md" @click="resetFilters" class="text-semantic-error">
          <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
          {{ t('diary.clearFilters') }}
        </BaseButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="space-y-6">
      <BaseSkeleton variant="card" />
      <BaseSkeleton variant="card" />
      <BaseSkeleton variant="card" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="mb-12">
      <BaseAlert variant="error">
        <h3 class="font-semibold">{{ t('diary.loadFailed') }}</h3>
        <p class="mt-1 opacity-90">{{ error.message }}</p>
      </BaseAlert>
    </div>

    <!-- Empty State -->
    <div v-else-if="groupedDiaries.length === 0" class="py-24 text-center">
      <div class="mb-6 flex justify-center">
        <Icon name="lucide:calendar-x" class="h-12 w-12 text-copy-muted opacity-20" />
      </div>
      <h3 class="text-xl font-semibold text-copy">{{ t('timeline.noEntries') }}</h3>
      <p class="mt-2 text-copy-secondary max-w-xs mx-auto text-sm">{{ t('diary.noDiaries') }}</p>
      <div class="mt-8">
        <BaseButton variant="primary" @click="navigateTo('/diaries/new')">
          {{ t('diary.newDiary') }}
        </BaseButton>
      </div>
    </div>

    <!-- Timeline Content -->
    <div v-else class="relative pl-8">
      <!-- Minimalist Vertical Line -->
      <div class="absolute left-0 top-0 bottom-0 w-px bg-line ml-[11px]"></div>

      <!-- Timeline groups -->
      <div v-for="group in groupedDiaries" :key="group.period" class="mb-16">
        <!-- Period header -->
        <div class="relative flex items-center mb-8 -ml-[33px]">
          <div class="w-[23px] h-[23px] bg-surface border-2 border-accent z-10 flex items-center justify-center">
            <div class="w-1.5 h-1.5 bg-accent"></div>
          </div>
          <div class="ml-6 flex items-baseline gap-3">
            <h2 class="text-sm font-semibold text-copy uppercase tracking-widest">
              {{ group.periodLabel }}
            </h2>
            <span class="text-[10px] text-copy-muted font-medium uppercase tracking-tighter">
              {{ group.diaries.length }} {{ t('timeline.entriesCount', group.diaries.length) }}
            </span>
          </div>
        </div>

        <!-- Diaries in this period -->
        <div class="space-y-6">
          <NuxtLink
            v-for="diary in group.diaries"
            :key="String(diary.id)"
            :to="`/diaries/${diary.id}`"
            class="block group"
          >
            <BaseCard clickable class="!p-0 overflow-hidden">
              <div class="p-6 sm:p-8">
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                  <div class="space-y-1">
                    <h3 class="text-xl font-semibold text-copy group-hover:text-accent transition-colors">
                      {{ diary.title }}
                    </h3>
                    <time class="text-xs text-copy-muted flex items-center">
                      <Icon name="lucide:calendar" class="mr-1.5 h-3.5 w-3.5" />
                      {{ formatDate(diary.date || diary.createdAt) }}
                    </time>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <BaseBadge v-if="diary.alerts?.length" variant="warning">
                      <Icon name="lucide:bell" class="mr-1 h-3 w-3" />
                      {{ diary.alerts.length }}
                    </BaseBadge>
                    <BaseBadge v-if="diary.transactions?.length" variant="success">
                      <Icon name="lucide:trending-up" class="mr-1 h-3 w-3" />
                      {{ diary.transactions.length }}
                    </BaseBadge>
                  </div>
                </div>

                <p class="text-copy-secondary text-sm sm:text-base line-clamp-2 leading-relaxed">
                  {{ diary.content ? diary.content.replace(/[#*`]/g, '') : t('timeline.noContent') }}
                </p>

                <div v-if="diary.tags?.length" class="mt-4 flex flex-wrap gap-2">
                  <span v-for="tag in diary.tags" :key="tag" class="text-[10px] text-copy-muted font-medium uppercase">
                    #{{ tag }}
                  </span>
                </div>
              </div>

              <!-- Footer action -->
              <div class="px-6 py-4 bg-surface-alt border-t border-line flex items-center justify-end">
                <span class="text-xs font-semibold text-copy-muted group-hover:text-accent transition-all flex items-center gap-2">
                  {{ t('timeline.viewDetails') }}
                  <Icon name="lucide:arrow-right" class="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </BaseCard>
          </NuxtLink>
        </div>
      </div>

      <!-- Load More Section -->
      <div v-if="isHydrated && hasMore" class="mt-12 text-center pb-20">
        <BaseButton 
          variant="secondary" 
          @click="loadMore" 
          :loading="loadingMore"
          class="min-w-[160px]"
        >
          <Icon v-if="!loadingMore" name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
          {{ t('common.loadMore') }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

definePageMeta({
  middleware: 'auth'
})

// Use the timeline diaries composable
const {
  isHydrated,
  pending,
  error,
  loadingMore,
  filters,
  hasMore,
  groupedDiaries,
  loadMore,
  resetFilters,
  formatDate
} = useTimelineDiaries()
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
