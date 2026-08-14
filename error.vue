<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const { t } = useI18n()

const isNotFound = computed(() => props.error.statusCode === 404)
const title = computed(() => {
  if (isNotFound.value) return t('error.notFound')
  if (props.error.statusCode >= 500) return t('error.serverError')
  return t('error.somethingWrong')
})

const goHome = () => clearError({ redirect: '/' })

// error.vue renders without app.vue, so load the design-system fonts here
useHead({
  title: () => `${title.value} · ${t('common.appName')}`,
  link: [
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com'
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: ''
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=Source+Sans+3:wght@400;500;600;700&display=swap'
    }
  ]
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-dt-bg px-4 py-16">
    <div
      class="w-full max-w-md rounded-dt-md border border-dt-border bg-dt-surface p-8 text-center shadow-dt-md"
      role="alert"
    >
      <p class="font-data text-sm font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
        {{ error.statusCode }}
      </p>
      <div class="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full border border-dt-border bg-dt-surface-strong">
        <Icon
          :name="isNotFound ? 'heroicons:magnifying-glass' : 'heroicons:exclamation-triangle'"
          class="h-7 w-7"
          :class="isNotFound ? 'text-dt-text-muted' : 'text-dt-danger'"
          aria-hidden="true"
        />
      </div>
      <h1 class="font-display mt-5 text-2xl tracking-tight text-dt-text">
        {{ title }}
      </h1>
      <BaseButton variant="primary" class="mt-8" @click="goHome">
        <Icon name="heroicons:home" class="h-4 w-4" aria-hidden="true" />
        {{ t('nav.home') }}
      </BaseButton>
    </div>
  </div>
</template>
