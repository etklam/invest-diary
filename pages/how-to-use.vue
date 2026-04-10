<template>
  <main class="how-to-use-page min-h-screen text-slate-900 dark:text-slate-100">
    <!-- Hero Section -->
    <section class="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 sm:pt-32">
      <div class="bg-grid absolute inset-0 opacity-20 dark:opacity-10" aria-hidden="true" />
      <div class="orb orb-1" aria-hidden="true" />
      <div class="orb orb-2" aria-hidden="true" />
      <div class="orb orb-3" aria-hidden="true" />

      <div class="relative mx-auto max-w-7xl">
        <div class="hero-shell p-6 md:p-10">
          <div class="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div class="reveal">
              <p class="inline-flex items-center gap-2 rounded-full border border-sky-300/50 bg-sky-50/50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-sky-700 backdrop-blur-md dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
                <Icon name="heroicons:map-20-solid" class="h-4 w-4" />
                {{ $t('howToUse.badge') }}
              </p>
              <h1 class="mt-6 max-w-4xl text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-7xl">
                <span class="gradient-text">{{ $t('howToUse.hero.title') }}</span>
              </h1>
              <p class="mt-8 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 sm:text-xl">
                {{ $t('howToUse.hero.subtitle') }}
              </p>

              <div class="mt-10 flex flex-wrap gap-4">
                <NuxtLink
                  :to="primaryLink"
                  class="btn-primary group"
                >
                  <span>{{ isAuthenticated ? $t('howToUse.cta.primaryAuth') : $t('howToUse.cta.primaryGuest') }}</span>
                  <Icon name="heroicons:arrow-right-20-solid" class="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </NuxtLink>
                <NuxtLink
                  to="/about"
                  class="btn-secondary"
                >
                  {{ $t('howToUse.cta.secondary') }}
                </NuxtLink>
              </div>
            </div>

            <aside class="workflow-board reveal reveal-2">
              <div class="flex items-center justify-between">
                <p class="board-label">{{ $t('howToUse.workflow.title') }}</p>
                <div class="flex gap-1.5">
                  <span class="h-2 w-2 rounded-full bg-red-400/60" />
                  <span class="h-2 w-2 rounded-full bg-amber-400/60" />
                  <span class="h-2 w-2 rounded-full bg-emerald-400/60" />
                </div>
              </div>
              <div class="mt-6 space-y-4">
                <article class="board-step group">
                  <div class="board-icon-wrapper">
                    <Icon name="heroicons:pencil-square-20-solid" class="h-5 w-5" />
                  </div>
                  <div>
                    <p class="board-step-label">{{ $t('howToUse.workflow.step1.label') }}</p>
                    <p class="board-step-title">{{ $t('howToUse.workflow.step1.title') }}</p>
                  </div>
                </article>
                <article class="board-step group">
                  <div class="board-icon-wrapper">
                    <Icon name="heroicons:link-20-solid" class="h-5 w-5" />
                  </div>
                  <div>
                    <p class="board-step-label">{{ $t('howToUse.workflow.step2.label') }}</p>
                    <p class="board-step-title">{{ $t('howToUse.workflow.step2.title') }}</p>
                  </div>
                </article>
                <article class="board-step group">
                  <div class="board-icon-wrapper">
                    <Icon name="heroicons:cpu-chip-20-solid" class="h-5 w-5" />
                  </div>
                  <div>
                    <p class="board-step-label">{{ $t('howToUse.workflow.step3.label') }}</p>
                    <p class="board-step-title">{{ $t('howToUse.workflow.step3.title') }}</p>
                  </div>
                </article>
                <article class="board-step group border-sky-400/30 bg-sky-400/5">
                  <div class="board-icon-wrapper bg-sky-500 text-white">
                    <Icon name="heroicons:arrows-right-left-20-solid" class="h-5 w-5" />
                  </div>
                  <div>
                    <p class="board-step-label text-sky-400">{{ $t('howToUse.workflow.step4.label') }}</p>
                    <p class="board-step-title font-semibold text-white">{{ $t('howToUse.workflow.step4.title') }}</p>
                  </div>
                </article>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>

    <!-- Getting Started Section -->
    <section class="px-4 pb-24 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="section-header reveal mb-12 text-center lg:text-left">
          <h2 class="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
            {{ $t('howToUse.gettingStarted.title') }}
          </h2>
          <p class="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-400">
            {{ $t('howToUse.gettingStarted.subtitle') }}
          </p>
        </div>

        <div class="grid gap-8 lg:grid-cols-3">
          <article class="guide-card reveal p-8">
            <div class="guide-number">01</div>
            <p class="guide-eyebrow mt-6">{{ $t('howToUse.gettingStarted.step1.eyebrow') }}</p>
            <h3 class="mt-4 text-2xl font-bold text-slate-950 dark:text-white">
              {{ $t('howToUse.gettingStarted.step1.title') }}
            </h3>
            <p class="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
              {{ $t('howToUse.gettingStarted.step1.description') }}
            </p>
            <NuxtLink to="/auth/register" class="guide-link mt-8 group">
              <span>{{ $t('howToUse.gettingStarted.step1.cta') }}</span>
              <Icon name="heroicons:arrow-long-right-20-solid" class="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </NuxtLink>
          </article>

          <article class="guide-card reveal reveal-2 p-8">
            <div class="guide-number">02</div>
            <p class="guide-eyebrow mt-6">{{ $t('howToUse.gettingStarted.step2.eyebrow') }}</p>
            <h3 class="mt-4 text-2xl font-bold text-slate-950 dark:text-white">
              {{ $t('howToUse.gettingStarted.step2.title') }}
            </h3>
            <p class="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
              {{ $t('howToUse.gettingStarted.step2.description') }}
            </p>
            <NuxtLink :to="workspaceLink" class="guide-link mt-8 group">
              <span>{{ $t('howToUse.gettingStarted.step2.cta') }}</span>
              <Icon name="heroicons:arrow-long-right-20-solid" class="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </NuxtLink>
          </article>

          <article class="guide-card reveal reveal-3 p-8 border-amber-500/20 shadow-amber-500/5">
            <div class="guide-number bg-amber-500/10 text-amber-600 dark:text-amber-400">03</div>
            <p class="guide-eyebrow mt-6 text-amber-600 dark:text-amber-500">{{ $t('howToUse.gettingStarted.step3.eyebrow') }}</p>
            <h3 class="mt-4 text-2xl font-bold text-slate-950 dark:text-white">
              {{ $t('howToUse.gettingStarted.step3.title') }}
            </h3>
            <p class="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
              {{ $t('howToUse.gettingStarted.step3.description') }}
            </p>
            <NuxtLink :to="settingsLink" class="guide-link mt-8 group text-amber-600 hover:text-amber-500">
              <span>{{ $t('howToUse.gettingStarted.step3.cta') }}</span>
              <Icon name="heroicons:arrow-long-right-20-solid" class="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </NuxtLink>
          </article>
        </div>
      </div>
    </section>

    <!-- Workflow Detail Section -->
    <section class="workflow-detail-section py-24 overflow-hidden relative" style="background: var(--color-panel-ink); color: var(--color-background);">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent opacity-50" />
      <div class="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div class="section-header reveal mb-16 text-center">
          <h2 class="text-4xl font-bold tracking-tight sm:text-5xl" style="color: var(--color-background);">
            {{ $t('howToUse.workflow.title') }}
          </h2>
          <p class="mx-auto mt-4 max-w-2xl text-lg" style="color: var(--color-text-muted);">
            {{ $t('howToUse.workflow.subtitle') }}
          </p>
        </div>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div v-for="(step, i) in 4" :key="i" class="sequence-card reveal" :class="`reveal-${i+1}`">
            <div class="sequence-icon-box">
              <Icon :name="['heroicons:pencil-square', 'heroicons:link', 'heroicons:cpu-chip', 'heroicons:arrows-right-left'][i] + '-20-solid'" class="h-8 w-8 text-sky-400" />
            </div>
            <h3 class="mt-6 text-xl font-bold" style="color: var(--color-background);">{{ $t(`howToUse.workflow.step${i+1}.title`) }}</h3>
            <p class="mt-4 leading-relaxed text-sm" style="color: var(--color-text-muted);">
              {{ $t(`howToUse.workflow.step${i+1}.description`) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature Surfaces Section -->
    <section class="px-4 py-24 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="section-header reveal mb-16">
          <h2 class="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
            {{ $t('howToUse.surfaces.title') }}
          </h2>
          <p class="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-400">
            {{ $t('howToUse.surfaces.subtitle') }}
          </p>
        </div>

        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <article v-for="(feature, key, i) in features" :key="key" class="surface-card reveal group" :class="`reveal-${(i%4)+1}`">
            <div class="surface-browser-frame">
              <div class="surface-browser-header">
                <div class="flex gap-1">
                  <span class="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span class="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span class="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>
              </div>
              <NuxtLink :to="feature.link" class="block overflow-hidden">
                <img :src="feature.img" :alt="$t(`howToUse.surfaces.${key}.title`)" class="surface-screenshot" loading="lazy" />
              </NuxtLink>
            </div>
            <div class="p-6">
              <p class="surface-kicker">{{ $t(feature.kicker) }}</p>
              <h3 class="mt-2 text-xl font-bold text-slate-950 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                {{ $t(`howToUse.surfaces.${key}.title`) }}
              </h3>
              <p class="mt-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {{ $t(`howToUse.surfaces.${key}.description`) }}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Tools Section -->
    <section class="px-4 pb-24 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="section-header reveal mb-16 text-right lg:text-left">
          <h2 class="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
            {{ $t('howToUse.tools.title') }}
          </h2>
          <p class="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-400 lg:ml-0 lg:mr-auto ml-auto">
            {{ $t('howToUse.tools.subtitle') }}
          </p>
        </div>

        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <NuxtLink v-for="(tool, key, i) in tools" :key="key" :to="tool.link" class="tool-card reveal group" :class="`reveal-${(i%4)+1}`">
            <div class="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 aspect-video">
              <img :src="tool.img" :alt="$t(`howToUse.tools.${key}.title`)" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span class="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  {{ $t('blog.readMore') }}
                  <Icon name="heroicons:arrow-right-20-solid" class="h-4 w-4" />
                </span>
              </div>
            </div>
            <div class="mt-6">
              <p class="surface-kicker">{{ $t(tool.kicker) }}</p>
              <h3 class="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                {{ $t(`howToUse.tools.${key}.title`) }}
              </h3>
              <p class="mt-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {{ $t(`howToUse.tools.${key}.description`) }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Final CTA Section -->
    <section class="px-4 pb-32 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="cta-banner reveal overflow-hidden relative">
          <div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
          <div class="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
          
          <div class="relative flex flex-col items-center text-center p-12 md:p-20">
            <h2 class="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl max-w-4xl">
              {{ $t('howToUse.cta.title') }}
            </h2>
            <p class="mt-8 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
              {{ $t('howToUse.cta.description') }}
            </p>
            <div class="mt-12 flex flex-col gap-4 sm:flex-row">
              <NuxtLink
                :to="primaryLink"
                class="btn-primary-large"
              >
                {{ isAuthenticated ? $t('howToUse.cta.primaryAuth') : $t('howToUse.cta.primaryGuest') }}
                <Icon name="heroicons:sparkles-20-solid" class="h-5 w-5" />
              </NuxtLink>
              <NuxtLink to="/about" class="btn-secondary-large">
                {{ $t('howToUse.cta.secondary') }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
definePageMeta({
  requiresAuth: false
})

const { t } = useI18n()
const { isAuthenticated } = useAuth()
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl || 'https://trade-basic.com').replace(/\/+$/, '')
const canonicalUrl = `${siteUrl}/how-to-use`
const primaryLink = computed(() => (isAuthenticated.value ? '/settings' : '/auth/register'))
const workspaceLink = computed(() => (isAuthenticated.value ? '/diaries' : '/auth/register'))
const settingsLink = computed(() => (isAuthenticated.value ? '/settings' : '/auth/register'))

const features = {
  quickNotes: { link: '/diaries/quick', img: '/screenshots/how-to-use-features/01-quick-notes.png', kicker: 'quickDiary.title' },
  diaries: { link: '/diaries', img: '/screenshots/how-to-use-features/02-diaries.png', kicker: 'nav.diaries' },
  timeline: { link: '/timeline', img: '/screenshots/how-to-use-features/03-timeline.png', kicker: 'nav.timeline' },
  alerts: { link: '/alerts', img: '/screenshots/how-to-use-features/04-alerts.png', kicker: 'nav.alerts' },
  compare: { link: '/timeline/compare', img: '/screenshots/how-to-use-features/05-partner-compare.png', kicker: 'compareDiary.kicker' },
  calendar: { link: '/calendar', img: '/screenshots/how-to-use-features/06-calendar.png', kicker: 'nav.calendar' },
  stocks: { link: '/stocks', img: '/screenshots/how-to-use-features/07-stocks.png', kicker: 'nav.stocks' },
  discipline: { link: '/discipline', img: '/screenshots/how-to-use-features/08-discipline.png', kicker: 'nav.discipline' },
  blog: { link: '/blog', img: '/screenshots/how-to-use-features/09-blog.png', kicker: 'nav.blog' }
}

const tools = {
  positionSizing: { link: '/tools/position-sizing', img: '/screenshots/how-to-use-features/10-position-sizing.png', kicker: 'nav.positionSizing' },
  financialFreedom: { link: '/tools/financial-freedom', img: '/screenshots/how-to-use-features/11-financial-freedom.png', kicker: 'nav.financialFreedom' },
  relativeValue: { link: '/tools/relative-value', img: '/screenshots/how-to-use-features/12-relative-value.png', kicker: 'nav.relativeValue' },
  etf: { link: '/tools/etf', img: '/screenshots/how-to-use-features/13-etf.png', kicker: 'nav.etf' },
  seasonality: { link: '/tools/seasonality', img: '/screenshots/how-to-use-features/14-seasonality.png', kicker: 'nav.seasonality' }
}

useHead(() => ({
  title: `${t('nav.howToUse')} - ${t('common.appName')}`,
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    { name: 'description', content: t('howToUse.hero.subtitle') },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: `${t('nav.howToUse')} - ${t('common.appName')}` },
    { property: 'og:description', content: t('howToUse.hero.subtitle') },
    { property: 'og:url', content: canonicalUrl },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: `${t('nav.howToUse')} - ${t('common.appName')}` },
    { name: 'twitter:description', content: t('howToUse.hero.subtitle') }
  ]
}))
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

.how-to-use-page {
  font-family: 'IBM Plex Sans', sans-serif;
  background: rgb(250 250 251);
}

:global(.dark .how-to-use-page), :global(.dark-mode .how-to-use-page) {
  background: rgb(8 10 15);
}

.bg-grid {
  background-image: radial-gradient(rgb(15 23 42 / 0.15) 1px, transparent 1px);
  background-size: 24px 24px;
}

:global(.dark .bg-grid), :global(.dark-mode .bg-grid) {
  background-image: radial-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1px);
}

.orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
  opacity: 0.5;
}

.orb-1 { width: 400px; height: 400px; background: rgb(56 189 248 / 0.2); top: -100px; right: -50px; }
.orb-2 { width: 350px; height: 350px; background: rgb(245 158 11 / 0.15); bottom: 20%; left: -100px; }
.orb-3 { width: 300px; height: 300px; background: rgb(139 92 246 / 0.1); top: 30%; right: 10%; }

.hero-shell {
  border: 1px solid rgb(255 255 255 / 0.6);
  border-radius: 2.5rem;
  background: rgb(255 255 255 / 0.4);
  backdrop-filter: blur(12px);
  box-shadow: 
    0 4px 6px -1px rgb(0 0 0 / 0.05),
    0 20px 25px -5px rgb(0 0 0 / 0.05);
}

:global(.dark .hero-shell), :global(.dark-mode .hero-shell) {
  border-color: rgb(255 255 255 / 0.05);
  background: rgb(255 255 255 / 0.02);
}

.gradient-text {
  background: linear-gradient(to bottom right, #0f172a, #334155);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

:global(.dark .gradient-text), :global(.dark-mode .gradient-text) {
  background: linear-gradient(to bottom right, #f8fafc, #94a3b8);
}

/* Buttons */
.btn-primary, .btn-primary-large {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  border-radius: 1rem;
  font-weight: 700;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary {
  background: #0f172a;
  color: white;
  padding: 0.875rem 1.75rem;
}

.btn-primary:hover {
  background: #1e293b;
  transform: translateY(-2px);
  box-shadow: 0 12px 20px -5px rgb(15 23 42 / 0.25);
}

.btn-primary-large {
  background: white;
  color: #0f172a;
  padding: 1.25rem 2.5rem;
  font-size: 1.125rem;
}

.btn-primary-large:hover {
  background: #f8fafc;
  transform: scale(1.05);
}

.btn-secondary, .btn-secondary-large {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 1.75rem;
  border-radius: 1rem;
  font-weight: 600;
  border: 1px solid rgb(15 23 42 / 0.1);
  background: white;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f8fafc;
  border-color: rgb(15 23 42 / 0.2);
}

.btn-secondary-large {
  border-color: rgb(255 255 255 / 0.2);
  background: transparent;
  color: white;
  padding: 1.25rem 2.5rem;
  font-size: 1.125rem;
}

.btn-secondary-large:hover {
  background: rgb(255 255 255 / 0.05);
}

:global(.dark .btn-secondary), :global(.dark-mode .btn-secondary) {
  background: transparent;
  border-color: rgb(255 255 255 / 0.1);
  color: #f8fafc;
}

:global(.dark .btn-secondary:hover), :global(.dark-mode .btn-secondary:hover) {
  background: rgb(255 255 255 / 0.05);
}

/* Workflow Board */
.workflow-board {
  border-radius: 2rem;
  background: #0f172a;
  padding: 2rem;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5);
  border: 1px solid rgb(255 255 255 / 0.1);
}

.board-label {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgb(14 165 233);
}

.board-step {
  display: flex;
  gap: 1.25rem;
  padding: 1.25rem;
  border-radius: 1.25rem;
  border: 1px solid transparent;
  transition: all 0.3s;
}

.board-step:hover:not(.border-sky-400\/30) {
  background: rgb(255 255 255 / 0.05);
  border-color: rgb(255 255 255 / 0.1);
}

.board-icon-wrapper {
  flex-shrink: 0;
  height: 2.75rem;
  width: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.875rem;
  background: rgb(255 255 255 / 0.1);
  color: rgb(148 163 184);
  transition: all 0.3s;
}

.board-step:hover .board-icon-wrapper {
  color: white;
  transform: scale(1.1);
}

.board-step-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.board-step-title {
  margin-top: 0.25rem;
  font-size: 0.9375rem;
  color: rgb(203 213 225);
  line-height: 1.5;
}

/* Cards */
.guide-card, .surface-card, .tool-card {
  border-radius: 1.75rem;
  border: 1px solid rgb(15 23 42 / 0.06);
  background: white;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

:global(.dark .guide-card), :global(.dark-mode .guide-card),
:global(.dark .surface-card), :global(.dark-mode .surface-card),
:global(.dark .tool-card), :global(.dark-mode .tool-card) {
  background: rgb(15 23 42 / 0.3);
  border-color: rgb(255 255 255 / 0.06);
}

.guide-card:hover, .surface-card:hover, .tool-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 30px 60px -15px rgb(15 23 42 / 0.1);
  border-color: rgb(14 165 233 / 0.3);
}

.guide-number {
  height: 3.5rem;
  width: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background: rgb(14 165 233 / 0.08);
  color: rgb(14 165 233);
  font-weight: 800;
  font-size: 1.25rem;
}

.guide-eyebrow {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgb(14 165 233);
}

.guide-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  color: #0f172a;
}

:global(.dark .guide-link), :global(.dark-mode .guide-link) { color: white; }

.sequence-card {
  background: rgb(255 255 255 / 0.03);
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 1.5rem;
  padding: 2rem;
  transition: all 0.3s;
}

.sequence-card:hover {
  background: rgb(255 255 255 / 0.07);
  border-color: rgb(14 165 233 / 0.4);
  transform: translateY(-4px);
}

.sequence-icon-box {
  height: 4rem;
  width: 4rem;
  background: rgb(14 165 233 / 0.1);
  border-radius: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Browser Frame */
.surface-browser-frame {
  border-bottom: 1px solid rgb(15 23 42 / 0.06);
  overflow: hidden;
}

.surface-browser-header {
  height: 1.75rem;
  background: #f8fafc;
  display: flex;
  align-items: center;
  padding: 0 0.75rem;
}

:global(.dark .surface-browser-header), :global(.dark-mode .surface-browser-header) {
  background: #0f172a;
}

.surface-screenshot {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  object-position: top;
  transition: transform 0.5s;
}

.surface-card:hover .surface-screenshot {
  transform: scale(1.05);
}

.surface-kicker {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

/* CTA Banner */
.cta-banner {
  border-radius: 3rem;
  background: #0f172a;
  box-shadow: 0 40px 80px -20px rgb(0 0 0 / 0.4);
}

/* Animations */
.reveal {
  opacity: 0;
  animation: reveal 0.8s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
}

.reveal-2 { animation-delay: 0.15s; }
.reveal-3 { animation-delay: 0.3s; }
.reveal-4 { animation-delay: 0.45s; }

@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .hero-shell {
    border-radius: 1.5rem;
  }
  .cta-banner {
    border-radius: 2rem;
  }
}
</style>