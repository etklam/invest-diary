<template>
  <div class="how-to-use-page min-h-screen">
    <section class="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 sm:pt-32">
      <div class="bg-grid absolute inset-0 opacity-20 dark:opacity-10" aria-hidden="true" />
      <div class="relative mx-auto max-w-7xl">
        <div class="hero-shell p-6 md:p-10">
          <div class="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div class="reveal">
              <p class="hero-badge inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
                <Icon name="heroicons:map-20-solid" class="h-4 w-4" />
                {{ $t('howToUse.badge') }}
              </p>
              <h1 class="mt-6 max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight text-dt-text sm:text-5xl lg:text-7xl">
                <span class="hero-title">{{ $t('howToUse.hero.title') }}</span>
              </h1>
              <p class="mt-8 max-w-2xl text-lg leading-relaxed text-dt-text-muted sm:text-xl">
                {{ $t('howToUse.hero.subtitle') }}
              </p>

              <div class="mt-10 flex flex-wrap gap-4">
                <NuxtLink :to="primaryLink" class="btn-primary group">
                  <span>{{ isAuthenticated ? $t('howToUse.cta.primaryAuth') : $t('howToUse.cta.primaryGuest') }}</span>
                  <Icon name="heroicons:arrow-right-20-solid" class="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </NuxtLink>
                <a href="#workflow" class="btn-secondary">
                  {{ $t('howToUse.hero.secondary') }}
                </a>
              </div>
            </div>

            <aside class="workflow-board reveal reveal-2">
              <div class="flex items-center justify-between">
                <p class="board-label">{{ $t('howToUse.workflow.title') }}</p>
                <div class="flex gap-1.5" aria-hidden="true">
                  <span class="h-2 w-2 rounded-full bg-dt-danger/60" />
                  <span class="h-2 w-2 rounded-full bg-dt-warning/60" />
                  <span class="h-2 w-2 rounded-full bg-dt-success/60" />
                </div>
              </div>
              <div class="mt-6 space-y-4">
                <article v-for="(step, i) in 4" :key="i" class="board-step group" :class="{ 'board-step-active': i === 3 }">
                  <div class="board-icon-wrapper" :class="{ 'board-icon-active': i === 3 }">
                    <Icon :name="workflowIcons[i] ?? ''" class="h-5 w-5" />
                  </div>
                  <div>
                    <p class="board-step-label" :class="{ 'board-step-label-active': i === 3 }">{{ $t(`howToUse.workflow.step${i + 1}.label`) }}</p>
                    <p class="board-step-title" :class="{ 'board-step-title-active': i === 3 }">{{ $t(`howToUse.workflow.step${i + 1}.title`) }}</p>
                  </div>
                </article>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 pb-24 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="section-header reveal mb-12 text-center lg:text-left">
          <h2 class="text-3xl font-bold tracking-tight text-dt-text sm:text-4xl lg:text-5xl">
            {{ $t('howToUse.gettingStarted.title') }}
          </h2>
          <p class="mt-4 max-w-3xl text-lg text-dt-text-muted">
            {{ $t('howToUse.gettingStarted.subtitle') }}
          </p>
        </div>

        <div class="grid gap-8 lg:grid-cols-3">
          <article v-for="(step, i) in 3" :key="i" class="guide-card reveal p-8" :class="{ 'reveal-2': i === 1, 'reveal-3': i === 2, 'border-dt-warning/20': i === 2 }">
            <div class="guide-number" :class="{ 'bg-dt-warning/10 text-dt-warning': i === 2 }">{{ `0${i + 1}` }}</div>
            <p class="guide-eyebrow mt-6" :class="{ 'text-dt-warning': i === 2 }">{{ $t(`howToUse.gettingStarted.step${i + 1}.eyebrow`) }}</p>
            <h3 class="mt-4 text-2xl font-bold text-dt-text">
              {{ $t(`howToUse.gettingStarted.step${i + 1}.title`) }}
            </h3>
            <p class="mt-4 leading-relaxed text-dt-text-muted">
              {{ $t(`howToUse.gettingStarted.step${i + 1}.description`) }}
            </p>
            <NuxtLink :to="gettingStartedLinks[i] ?? '/how-to-use'" class="guide-link mt-8 group" :class="{ 'text-dt-warning hover:text-dt-warning-strong': i === 2 }">
              <span>{{ $t(`howToUse.gettingStarted.step${i + 1}.cta`) }}</span>
              <Icon name="heroicons:arrow-long-right-20-solid" class="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </NuxtLink>
          </article>
        </div>
      </div>
    </section>

    <section id="workflow" class="workflow-detail-section relative overflow-hidden py-24" style="background: var(--color-panel-ink); color: var(--color-on-ink);">
      <div class="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div class="section-header reveal mb-16 text-center">
          <h2 class="text-4xl font-bold tracking-tight sm:text-5xl" style="color: var(--color-on-ink);">
            {{ $t('howToUse.workflow.title') }}
          </h2>
          <p class="mx-auto mt-4 max-w-2xl text-lg" style="color: var(--color-text-muted);">
            {{ $t('howToUse.workflow.subtitle') }}
          </p>
        </div>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div v-for="(step, i) in 4" :key="i" class="sequence-card reveal" :class="`reveal-${i + 1}`">
            <div class="sequence-icon-box">
              <Icon :name="workflowIcons[i] ?? ''" class="sequence-icon h-8 w-8" />
            </div>
            <p class="mt-6 text-xs font-bold uppercase tracking-[0.16em]" style="color: var(--color-accent);">{{ $t(`howToUse.workflow.step${i + 1}.label`) }}</p>
            <h3 class="mt-3 text-xl font-bold" style="color: var(--color-on-ink);">{{ $t(`howToUse.workflow.step${i + 1}.title`) }}</h3>
            <p class="mt-4 text-sm leading-relaxed" style="color: var(--color-text-muted);">
              {{ $t(`howToUse.workflow.step${i + 1}.description`) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section v-for="(group, groupIndex) in surfaceGroups" :id="group.id" :key="group.id" class="px-4 py-24 sm:px-6" :class="{ 'pb-24 pt-0': groupIndex === 1 }">
      <div class="mx-auto max-w-7xl">
        <div class="section-header reveal mb-16" :class="{ 'text-right lg:text-left': groupIndex === 1 }">
          <h2 class="text-3xl font-bold tracking-tight text-dt-text sm:text-4xl lg:text-5xl">
            {{ $t(group.title) }}
          </h2>
          <p class="mt-4 max-w-3xl text-lg text-dt-text-muted" :class="{ 'lg:ml-0 lg:mr-auto ml-auto': groupIndex === 1 }">
            {{ $t(group.subtitle) }}
          </p>
        </div>

        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <article v-for="(feature, key, i) in group.items" :key="key" class="surface-card reveal group" :class="`reveal-${(i % 4) + 1}`">
            <div class="surface-browser-frame">
              <div class="surface-browser-header">
                <div class="flex gap-1" aria-hidden="true">
                  <span class="h-1.5 w-1.5 rounded-full bg-dt-text-soft/40" />
                  <span class="h-1.5 w-1.5 rounded-full bg-dt-text-soft/40" />
                  <span class="h-1.5 w-1.5 rounded-full bg-dt-text-soft/40" />
                </div>
              </div>
              <NuxtLink :to="feature.link" class="block overflow-hidden">
                <img :src="feature.img" :alt="$t(`howToUse.${group.key}.${key}.title`)" class="surface-screenshot" loading="lazy" />
              </NuxtLink>
            </div>
            <div class="p-6">
              <p class="surface-kicker">{{ $t(feature.kicker) }}</p>
              <h3 class="surface-title mt-2 text-xl font-bold transition-colors">
                {{ $t(`howToUse.${group.key}.${key}.title`) }}
              </h3>
              <p class="mt-3 text-sm leading-relaxed text-dt-text-muted">
                {{ $t(`howToUse.${group.key}.${key}.description`) }}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="px-4 pb-32 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="cta-banner reveal relative overflow-hidden">
          <div class="relative flex flex-col items-center p-12 text-center md:p-20">
            <h2 class="max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {{ $t('howToUse.cta.title') }}
            </h2>
            <p class="mt-8 max-w-2xl text-lg leading-relaxed text-dt-on-ink/80 sm:text-xl">
              {{ $t('howToUse.cta.description') }}
            </p>
            <div class="mt-12 flex flex-col gap-4 sm:flex-row">
              <NuxtLink :to="primaryLink" class="btn-primary-large">
                {{ isAuthenticated ? $t('howToUse.cta.primaryAuth') : $t('howToUse.cta.primaryGuest') }}
                <Icon name="heroicons:arrow-right-20-solid" class="h-5 w-5" />
              </NuxtLink>
              <NuxtLink to="/about" class="btn-secondary-large">
                {{ $t('howToUse.cta.secondary') }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { AUTHENTICATED_HOME_ROUTE } from '~/lib/routes'

definePageMeta({
  requiresAuth: false
})

const { t } = useI18n()
const { isAuthenticated } = useAuth()
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl || 'https://trade-basic.com').replace(/\/+$/, '')
const canonicalUrl = `${siteUrl}/how-to-use`
const primaryLink = computed(() => (isAuthenticated.value ? AUTHENTICATED_HOME_ROUTE : '/auth/register'))
const gettingStartedLinks = computed(() => (
  isAuthenticated.value
    ? [AUTHENTICATED_HOME_ROUTE, '/diaries/quick', '/timeline/compare']
    : ['/auth/register', '/auth/register', '/auth/register']
))
const workflowIcons = [
  'heroicons:pencil-square-20-solid',
  'heroicons:clock-20-solid',
  'heroicons:users-20-solid',
  'heroicons:arrow-path-20-solid',
]

const workspaceFeatures = {
  timeline: { link: '/timeline', img: '/screenshots/how-to-use-features/00-timeline.png', kicker: 'nav.timeline' },
  quickDiary: { link: '/diaries/quick', img: '/screenshots/how-to-use-features/01-quick-diary.png', kicker: 'quickDiary.title' },
  diaries: { link: '/diaries', img: '/screenshots/how-to-use-features/02-diaries.png', kicker: 'nav.diaries' },
  reviews: { link: '/reviews', img: '/screenshots/how-to-use-features/03-review-queue.png', kicker: 'nav.reviewQueue' },
  tradePlans: { link: '/trade-plans/new', img: '/screenshots/how-to-use-features/04-trade-plans.png', kicker: 'nav.tradePlans' },
  holdings: { link: '/stocks', img: '/screenshots/how-to-use-features/05-holdings.png', kicker: 'nav.stocks' },
  watchlist: { link: '/stocks/watchlist', img: '/screenshots/how-to-use-features/06-watchlist.png', kicker: 'nav.watchlist' },
  performance: { link: '/strategy-performance', img: '/screenshots/how-to-use-features/07-strategy-performance.png', kicker: 'nav.strategyPerformance' },
  marketRotation: { link: '/tools/market-rotation', img: '/screenshots/how-to-use-features/08-market-rotation.png', kicker: 'nav.marketRotation' },
  partners: { link: '/partners', img: '/screenshots/how-to-use-features/09-partners.png', kicker: 'nav.partners' },
  compare: { link: '/timeline/compare', img: '/screenshots/how-to-use-features/10-compare.png', kicker: 'compareDiary.kicker' },
}

const tools = {
  positionSizing: { link: '/tools/position-sizing', img: '/screenshots/how-to-use-features/11-position-sizing.png', kicker: 'nav.positionSizing' },
  financialFreedom: { link: '/tools/financial-freedom', img: '/screenshots/how-to-use-features/12-financial-freedom.png', kicker: 'nav.financialFreedom' },
  relativeValue: { link: '/tools/relative-value', img: '/screenshots/how-to-use-features/13-relative-value.png', kicker: 'nav.relativeValue' },
  seasonality: { link: '/tools/seasonality', img: '/screenshots/how-to-use-features/14-seasonality.png', kicker: 'nav.seasonality' },
  secFilings: { link: '/tools/sec-filings', img: '/screenshots/how-to-use-features/15-sec-filings.png', kicker: 'nav.secFilings' },
}

const surfaceGroups = [
  { key: 'surfaces', id: 'workspace', title: 'howToUse.surfaces.title', subtitle: 'howToUse.surfaces.subtitle', items: workspaceFeatures },
  { key: 'tools', id: 'tools', title: 'howToUse.tools.title', subtitle: 'howToUse.tools.subtitle', items: tools },
]

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

// Structured data
const { injectFAQSchema, injectBreadcrumbSchema } = useStructuredData()
injectBreadcrumbSchema([
  { name: t('nav.home'), url: '/' },
  { name: t('nav.howToUse') },
])
injectFAQSchema([
  {
    question: t('howToUse.gettingStarted.step1.title'),
    answer: t('howToUse.gettingStarted.step1.description'),
  },
  {
    question: t('howToUse.gettingStarted.step2.title'),
    answer: t('howToUse.gettingStarted.step2.description'),
  },
  {
    question: t('howToUse.gettingStarted.step3.title'),
    answer: t('howToUse.gettingStarted.step3.description'),
  },
])
</script>

<style scoped>
.how-to-use-page {
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-background);
}

:global(.dark .how-to-use-page), :global(.dark-mode .how-to-use-page) {
  color: var(--color-text);
  background: var(--color-background);
}

.bg-grid {
  background-image: radial-gradient(color-mix(in srgb, var(--color-primary) 14%, transparent) 1px, transparent 1px);
  background-size: 24px 24px;
}

:global(.dark .bg-grid), :global(.dark-mode .bg-grid) {
  background-image: radial-gradient(color-mix(in srgb, var(--color-text-soft) 12%, transparent) 1px, transparent 1px);
}

.hero-shell {
  border: 1px solid color-mix(in srgb, var(--color-border) 72%, transparent);
  border-radius: 2rem;
  background: var(--color-surface);
  box-shadow: 0 18px 40px -28px rgb(12 22 38 / 0.32);
}

.hero-badge {
  color: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 28%, transparent);
  background: color-mix(in srgb, var(--color-surface) 84%, var(--color-primary) 16%);
}

.hero-title {
  color: var(--color-text);
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
  background: var(--color-primary);
  color: var(--color-on-ink);
  padding: 0.875rem 1.75rem;
}

:global(.dark .btn-primary),
:global(.dark-mode .btn-primary) {
  color: var(--color-on-ink);
}

.btn-primary:hover {
  background: color-mix(in srgb, var(--color-primary) 86%, black);
  transform: translateY(-2px);
  box-shadow: 0 12px 20px -5px color-mix(in srgb, var(--color-primary) 30%, transparent);
}

.btn-primary-large {
  background: var(--color-surface);
  color: var(--color-primary);
  padding: 1.25rem 2.5rem;
  font-size: 1.125rem;
}

.btn-primary-large:hover {
  background: color-mix(in srgb, var(--color-surface) 88%, var(--color-accent) 12%);
  transform: scale(1.05);
}

.btn-secondary, .btn-secondary-large {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 1.75rem;
  border-radius: 1rem;
  font-weight: 600;
  border: 1px solid color-mix(in srgb, var(--color-border) 74%, transparent);
  background: var(--color-surface);
  color: var(--color-text);
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: color-mix(in srgb, var(--color-surface) 85%, var(--color-primary) 15%);
  border-color: color-mix(in srgb, var(--color-primary) 20%, transparent);
}

.btn-secondary-large {
  border-color: color-mix(in srgb, var(--color-on-ink) 35%, transparent);
  background: transparent;
  color: var(--color-on-ink);
  padding: 1.25rem 2.5rem;
  font-size: 1.125rem;
}

.btn-secondary-large:hover {
  background: color-mix(in srgb, var(--color-on-ink) 10%, transparent);
}

:global(.dark .btn-secondary-large),
:global(.dark-mode .btn-secondary-large) {
  color: var(--color-on-ink);
}

:global(.dark .btn-secondary), :global(.dark-mode .btn-secondary) {
  background: transparent;
  border-color: rgb(255 255 255 / 0.1);
  color: var(--color-on-ink);
}

:global(.dark .btn-secondary:hover), :global(.dark-mode .btn-secondary:hover) {
  background: rgb(255 255 255 / 0.05);
}

/* Workflow Board */
.workflow-board {
  border-radius: 1.5rem;
  background: var(--color-panel-ink);
  padding: 2rem;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5);
  border: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
}

.board-label {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.board-step {
  display: flex;
  gap: 1.25rem;
  padding: 1.25rem;
  border-radius: 1.25rem;
  border: 1px solid transparent;
  transition: all 0.3s;
}

.board-step:hover:not(.board-step-active) {
  background: rgb(255 255 255 / 0.05);
  border-color: rgb(255 255 255 / 0.1);
}

.board-step-active {
  border-color: color-mix(in srgb, var(--color-accent) 36%, transparent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
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
  color: color-mix(in srgb, var(--color-on-ink) 65%, transparent);
  transition: all 0.3s;
}

.board-icon-active {
  background: var(--color-accent);
  color: var(--color-on-ink);
}

:global(.dark .board-icon-active),
:global(.dark-mode .board-icon-active) {
  color: var(--color-on-ink);
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
  color: color-mix(in srgb, var(--color-on-ink) 55%, transparent);
}

.board-step-label-active { color: var(--color-accent); }

.board-step-title {
  margin-top: 0.25rem;
  font-size: 0.9375rem;
  color: color-mix(in srgb, var(--color-on-ink) 80%, transparent);
  line-height: 1.5;
}

.board-step-title-active { color: var(--color-on-ink); }

/* Cards */
.guide-card, .surface-card, .tool-card {
  border-radius: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--color-border) 75%, transparent);
  background: var(--color-surface);
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
  border-color: color-mix(in srgb, var(--color-accent) 32%, transparent);
}

.guide-number {
  height: 3.5rem;
  width: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  color: var(--color-accent);
  font-weight: 800;
  font-size: 1.25rem;
}

.guide-eyebrow {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.guide-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  color: var(--color-primary);
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
  border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
  transform: translateY(-4px);
}

.sequence-icon-box {
  height: 4rem;
  width: 4rem;
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  border-radius: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sequence-icon {
  color: var(--color-accent);
}

/* Browser Frame */
.surface-browser-frame {
  border-bottom: 1px solid rgb(15 23 42 / 0.06);
  background: var(--color-panel-ink);
  overflow: hidden;
}

.surface-browser-header {
  height: 1.75rem;
  background: var(--color-on-ink);
  display: flex;
  align-items: center;
  padding: 0 0.75rem;
}

:global(.dark .surface-browser-header), :global(.dark-mode .surface-browser-header) {
  background: #0f172a;
}

.surface-screenshot {
  display: block;
  width: min(100%, 17rem);
  height: auto;
  aspect-ratio: 390 / 844;
  max-height: 34rem;
  margin: 0 auto;
  object-fit: cover;
  object-position: top;
  transition: opacity 0.2s ease;
}

.surface-card:hover .surface-screenshot {
  opacity: 0.92;
}

.surface-kicker {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.surface-title {
  color: var(--color-text);
}

.surface-card:hover .surface-title {
  color: var(--color-primary);
}

/* CTA Banner */
.cta-banner {
  border-radius: 1rem;
  background: var(--color-panel-ink);
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
