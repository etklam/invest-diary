<script setup lang="ts">
import { computed } from 'vue'
import { buildDisciplineOgImageURL, parseImportParam } from '~/lib/disciplineShare'

definePageMeta({
  requiresAuth: false,
})

const route = useRoute()
const config = useRuntimeConfig()
const { t } = useI18n()
const siteUrl = String(config.public.siteUrl || 'https://trade-basic.com').replace(/\/+$/, '')

const importParam = computed(() => firstQueryValue(route.query.import))
const preview = computed(() => parseImportParam(importParam.value))
const title = computed(() => preview.value?.title || t('discipline.sharePage.defaultTitle'))
const description = computed(() => preview.value?.description || `${preview.value?.count || 0} trading disciplines`)
const canonicalUrl = computed(() => `${siteUrl}/discipline/share${importParam.value ? `?import=${encodeURIComponent(importParam.value)}` : ''}`)
const ogImage = computed(() => buildDisciplineOgImageURL(preview.value, siteUrl))
const importUrl = computed(() => `/discipline${importParam.value ? `?import=${encodeURIComponent(importParam.value)}` : ''}`)

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: ogImage,
})

useHead({
  link: [
    { rel: 'canonical', href: canonicalUrl },
  ],
})

function firstQueryValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] || '')
  return typeof value === 'string' ? value : ''
}
</script>

<template>
  <div class="min-h-screen" style="background: var(--color-panel-ink)">
    <section class="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16 text-dt-on-ink">
      <p class="mb-4 text-sm font-semibold tracking-wide text-dt-secondary">{{ t('discipline.sharePage.kicker') }}</p>

      <h1 class="mb-5 font-display text-4xl font-semibold leading-tight sm:text-5xl">
        {{ title }}
      </h1>

      <p class="mb-8 text-lg leading-8 text-dt-on-ink/80">
        {{ description }}
      </p>

      <div class="mb-10 grid gap-3">
        <div
          v-for="(discipline, index) in preview?.disciplines.slice(0, 5)"
          :key="`${discipline.order}-${index}`"
          class="rounded-dt-sm border border-dt-on-ink/10 bg-dt-on-ink/5 px-4 py-3"
        >
          {{ index + 1 }}. {{ discipline.content }}
        </div>
      </div>

      <NuxtLink
        :to="importUrl"
        class="inline-flex min-h-11 w-fit items-center justify-center rounded-dt-sm bg-dt-primary-solid px-5 py-3 font-semibold text-white transition-colors hover:bg-dt-primary-solid-active"
      >
        {{ t('discipline.sharePage.importCta') }}
      </NuxtLink>
    </section>
  </div>
</template>
