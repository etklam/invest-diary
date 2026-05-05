<template>
  <div class="min-h-screen pb-20">
    <div class="max-w-4xl mx-auto px-4 py-8 sm:py-10">
      <header class="mb-8">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="settings-h1 text-2xl font-semibold sm:text-3xl">
              {{ t('partners.title') }}
            </h1>
            <p class="settings-hint mt-2 text-sm">
              {{ t('partners.subtitle') }}
            </p>
          </div>
          <NuxtLink
            to="/diaries"
            class="action-btn-muted-dashboard inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-600 dark:hover:text-indigo-300"
          >
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
            {{ t('partners.backToDashboard') }}
          </NuxtLink>
        </div>
      </header>

      <div class="space-y-6">
        <SettingsPartnerSettingsPanel />
        <SettingsApiKeySettingsPanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

definePageMeta({
  middleware: 'auth'
})

useHead({
  title: `${t('partners.title')} - ${t('common.appName')}`
})
</script>

<style scoped>
.settings-h1 {
  font-family: var(--font-display);
  color: var(--color-text);
}

.settings-hint {
  color: var(--color-text-soft);
}
</style>
