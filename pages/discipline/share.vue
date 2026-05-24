<script setup lang="ts">
import { computed } from 'vue'
import { buildDisciplineOgImageURL, parseImportParam } from '~/lib/disciplineShare'

definePageMeta({
  requiresAuth: false,
})

const route = useRoute()
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl || 'https://trade-basic.com').replace(/\/+$/, '')

const importParam = computed(() => firstQueryValue(route.query.import))
const preview = computed(() => parseImportParam(importParam.value))
const title = computed(() => preview.value?.title || '我的投資紀律')
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
  <main class="min-h-screen bg-slate-950 text-white">
    <section class="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
      <p class="mb-4 text-sm font-semibold uppercase tracking-wide text-cyan-300">投資日記 · Discipline</p>

      <h1 class="mb-5 text-4xl font-bold leading-tight sm:text-5xl">
        {{ title }}
      </h1>

      <p class="mb-8 text-lg leading-8 text-slate-300">
        {{ description }}
      </p>

      <div class="mb-10 grid gap-3">
        <div
          v-for="(discipline, index) in preview?.disciplines.slice(0, 5)"
          :key="`${discipline.order}-${index}`"
          class="border-l-2 border-cyan-300 bg-white/5 px-4 py-3 text-slate-100"
        >
          {{ index + 1 }}. {{ discipline.content }}
        </div>
      </div>

      <NuxtLink
        :to="importUrl"
        class="inline-flex w-fit items-center justify-center rounded-sm bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
      >
        匯入這份紀律
      </NuxtLink>
    </section>
  </main>
</template>
