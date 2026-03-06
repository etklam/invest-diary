<template>
  <main class="fintech-home min-h-screen text-slate-900 dark:text-slate-100">
    <section class="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div class="bg-grid absolute inset-0 opacity-35" aria-hidden="true" />
      <div class="orb orb-cyan" aria-hidden="true" />
      <div class="orb orb-orange" aria-hidden="true" />

      <div class="relative mx-auto max-w-7xl">
        <div class="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div class="reveal">
            <p class="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 backdrop-blur dark:border-sky-700/60 dark:bg-slate-900/80 dark:text-sky-200">
              <Icon name="heroicons:shield-check-20-solid" class="h-4 w-4 text-sky-600 dark:text-sky-300" />
              {{ $t('home.badge') }}
            </p>
            <h1 class="text-4xl font-semibold leading-tight text-slate-950 dark:text-slate-100 sm:text-5xl lg:text-6xl">
              {{ $t('home.hero.title') }}
            </h1>
            <p class="mt-6 max-w-2xl text-base leading-relaxed text-slate-700 dark:text-slate-300 sm:text-lg">
              {{ $t('home.hero.subtitle') }}
            </p>

            <div class="mt-8 flex flex-col gap-4 sm:flex-row">
              <NuxtLink
                to="/auth/register"
                class="action-btn action-btn-primary cursor-pointer"
              >
                {{ $t('home.hero.getStarted') }}
                <Icon name="heroicons:arrow-up-right-20-solid" class="h-5 w-5" />
              </NuxtLink>
              <NuxtLink
                to="/about"
                class="action-btn action-btn-secondary cursor-pointer"
              >
                {{ $t('home.hero.learnMore') }}
              </NuxtLink>
            </div>

            <dl class="mt-10 grid gap-4 sm:grid-cols-3">
              <div class="metric-card reveal reveal-2">
                <dt class="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{{ $t('home.progress.journalLabel') }}</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{{ $t('home.progress.journalValue') }}</dd>
              </div>
              <div class="metric-card reveal reveal-3">
                <dt class="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{{ $t('home.progress.reviewLabel') }}</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{{ $t('home.progress.reviewValue') }}</dd>
              </div>
              <div class="metric-card reveal reveal-4">
                <dt class="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{{ $t('home.progress.rulesLabel') }}</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{{ $t('home.progress.rulesValue') }}</dd>
              </div>
            </dl>
          </div>

          <div class="reveal reveal-2">
            <div class="terminal-panel">
              <header class="terminal-head">
                <span class="font-medium text-slate-200">{{ $t('home.snapshot.title') }}</span>
                <span class="rounded-full border border-emerald-400/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">
                  {{ $t('home.snapshot.status') }}
                </span>
              </header>
              <div class="space-y-3 p-5">
                <div class="row-item">
                  <span class="text-slate-300">{{ $t('home.snapshot.focusLabel') }}</span>
                  <span class="font-semibold text-emerald-300">{{ $t('home.snapshot.focusValue') }}</span>
                </div>
                <div class="row-item">
                  <span class="text-slate-300">{{ $t('home.snapshot.methodLabel') }}</span>
                  <span class="font-semibold text-amber-300">{{ $t('home.snapshot.methodValue') }}</span>
                </div>
                <div class="row-item">
                  <span class="text-slate-300">{{ $t('home.snapshot.communityLabel') }}</span>
                  <span class="font-semibold text-sky-300">{{ $t('home.snapshot.communityValue') }}</span>
                </div>
                <div class="h-px bg-slate-700/60" />
                <p class="text-sm leading-6 text-slate-400">
                  {{ $t('home.snapshot.description') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="trust-strip reveal">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{{ $t('home.promise.title') }}</p>
          <div class="mt-4 flex flex-wrap gap-3">
            <span class="trust-pill">{{ $t('home.promise.basics') }}</span>
            <span class="trust-pill">{{ $t('home.promise.risk') }}</span>
            <span class="trust-pill">{{ $t('home.promise.community') }}</span>
            <span class="trust-pill">{{ $t('home.promise.longTerm') }}</span>
            <span class="trust-pill">{{ $t('home.promise.noGuarantee') }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6">
      <div class="section-panel mx-auto max-w-7xl">
        <div class="mb-10 reveal">
          <h2 class="section-title text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            {{ $t('home.learning.title') }}
          </h2>
          <p class="section-subtitle mt-3 max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ $t('home.learning.subtitle') }}
          </p>
        </div>
        <div class="grid gap-5 md:grid-cols-3">
          <article class="feature-card reveal">
            <Icon name="heroicons:academic-cap-20-solid" class="feature-icon text-sky-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.learning.basics.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.learning.basics.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-2">
            <Icon name="heroicons:shield-exclamation-20-solid" class="feature-icon text-amber-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.learning.risk.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.learning.risk.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-3">
            <Icon name="heroicons:arrow-path-20-solid" class="feature-icon text-emerald-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.learning.review.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.learning.review.description') }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6">
      <div class="section-panel mx-auto max-w-7xl">
        <div class="mb-10 reveal">
          <h2 class="section-title text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            {{ $t('home.community.title') }}
          </h2>
          <p class="section-subtitle mt-3 max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ $t('home.community.subtitle') }}
          </p>
        </div>
        <div class="grid gap-5 md:grid-cols-3">
          <article class="feature-card reveal">
            <Icon name="heroicons:chat-bubble-left-right-20-solid" class="feature-icon text-cyan-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.community.share.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.community.share.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-2">
            <Icon name="heroicons:hand-thumb-up-20-solid" class="feature-icon text-indigo-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.community.feedback.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.community.feedback.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-3">
            <Icon name="heroicons:user-group-20-solid" class="feature-icon text-rose-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.community.accountability.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.community.accountability.description') }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6">
      <div class="section-panel mx-auto max-w-7xl">
        <div class="mb-10 reveal">
          <h2 class="section-title text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            {{ $t('home.turnaround.title') }}
          </h2>
          <p class="section-subtitle mt-3 max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ $t('home.turnaround.subtitle') }}
          </p>
        </div>
        <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <article class="feature-card reveal">
            <h3 class="text-lg font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.turnaround.step1.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.turnaround.step1.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-2">
            <h3 class="text-lg font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.turnaround.step2.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.turnaround.step2.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-3">
            <h3 class="text-lg font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.turnaround.step3.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.turnaround.step3.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-4">
            <h3 class="text-lg font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.turnaround.step4.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.turnaround.step4.description') }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6">
      <div class="section-panel mx-auto max-w-7xl">
        <div class="mb-10 reveal">
          <h2 class="section-title text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            {{ $t('home.features.title') }}
          </h2>
          <p class="section-subtitle mt-3 max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ $t('home.features.subtitle') }}
          </p>
        </div>

        <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <article class="feature-card reveal">
            <Icon name="heroicons:book-open-20-solid" class="feature-icon text-sky-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.features.diary.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.features.diary.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-2">
            <Icon name="heroicons:chart-bar-square-20-solid" class="feature-icon text-emerald-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.features.stocks.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.features.stocks.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-3">
            <Icon name="heroicons:bell-alert-20-solid" class="feature-icon text-orange-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.features.alerts.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.features.alerts.description') }}</p>
          </article>
          <article class="feature-card reveal">
            <Icon name="heroicons:clock-20-solid" class="feature-icon text-indigo-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.features.timeline.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.features.timeline.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-2">
            <Icon name="heroicons:lock-closed-20-solid" class="feature-icon text-rose-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.features.security.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.features.security.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-3">
            <Icon name="heroicons:moon-20-solid" class="feature-icon text-cyan-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('home.features.themes.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('home.features.themes.description') }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="px-4 pb-24 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="story-panel reveal">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <h2 class="text-2xl font-semibold text-slate-50 sm:text-3xl">{{ $t('home.cta.title') }}</h2>
            <NuxtLink to="/auth/login" class="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition-colors duration-200 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer">
              {{ $t('home.cta.login') }}
              <Icon name="heroicons:arrow-right-20-solid" class="h-4 w-4" />
            </NuxtLink>
          </div>
          <p class="mt-4 max-w-3xl text-base text-slate-300 sm:text-lg">
            {{ $t('home.cta.description') }}
          </p>
          <div class="mt-8 grid gap-4 md:grid-cols-3">
            <article class="chapter-card">
              <p class="chapter-label">{{ $t('home.cta.step1.label') }}</p>
              <h3 class="mt-2 text-lg font-semibold text-white">{{ $t('home.cta.step1.title') }}</h3>
              <p class="mt-2 text-sm text-slate-300">{{ $t('home.cta.step1.description') }}</p>
            </article>
            <article class="chapter-card">
              <p class="chapter-label">{{ $t('home.cta.step2.label') }}</p>
              <h3 class="mt-2 text-lg font-semibold text-white">{{ $t('home.cta.step2.title') }}</h3>
              <p class="mt-2 text-sm text-slate-300">{{ $t('home.cta.step2.description') }}</p>
            </article>
            <article class="chapter-card">
              <p class="chapter-label">{{ $t('home.cta.step3.label') }}</p>
              <h3 class="mt-2 text-lg font-semibold text-white">{{ $t('home.cta.step3.title') }}</h3>
              <p class="mt-2 text-sm text-slate-300">{{ $t('home.cta.step3.description') }}</p>
            </article>
          </div>
          <p class="mt-6 text-sm leading-6 text-slate-300">
            {{ $t('home.cta.disclaimer') }}
          </p>
          <NuxtLink
            to="/auth/register"
            class="mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-3 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
          >
            {{ $t('home.cta.register') }}
            <Icon name="heroicons:arrow-up-right-20-solid" class="h-5 w-5" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <footer class="border-t border-slate-200/70 bg-slate-50 dark:bg-slate-950 dark:border-slate-700 px-4 py-10 sm:px-6">
      <div class="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <p class="font-semibold text-slate-900 dark:text-slate-100">{{ $t('common.appName') }}</p>
        <div class="flex items-center gap-6">
          <NuxtLink to="/about" class="transition-colors duration-200 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 cursor-pointer">
            {{ $t('nav.about') }}
          </NuxtLink>
          <p>&copy; {{ currentYear }} {{ $t('home.footer.rights') }}</p>
        </div>
      </div>
    </footer>
  </main>
</template>

<script setup lang="ts">
definePageMeta({
  requiresAuth: false
})

const { t } = useI18n()
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl || 'https://trade-basic.com').replace(/\/+$/, '')
const canonicalUrl = `${siteUrl}/`

useHead(() => {
  const title = `${t('home.hero.title')} - ${t('common.appName')}`
  const description = t('home.hero.subtitle')

  return {
    title,
    link: [{ rel: 'canonical', href: canonicalUrl }],
    meta: [
      { name: 'description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonicalUrl },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description }
    ]
  }
})

const currentYear = new Date().getFullYear()
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

.fintech-home {
  --home-primary: #0ea5e9;
  --home-secondary: #38bdf8;
  --home-cta: #f97316;
  --home-bg: #f0f9ff;
  --home-text: #0c4a6e;
  font-family: 'IBM Plex Sans', 'Avenir Next', 'Segoe UI', sans-serif;
  background:
    radial-gradient(1200px 700px at 12% -10%, rgb(56 189 248 / 18%), transparent 58%),
    radial-gradient(1100px 620px at 95% -5%, rgb(249 115 22 / 12%), transparent 62%),
    var(--home-bg);
}

.section-panel {
  border: 1px solid rgb(186 230 253 / 70%);
  border-radius: 1.25rem;
  padding: 1.5rem;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 72%), rgb(255 255 255 / 56%));
  box-shadow: 0 16px 35px rgb(15 23 42 / 8%);
}

:global(.dark .section-panel),
:global(.dark-mode .section-panel) {
  border-color: rgb(51 65 85 / 88%);
  background:
    linear-gradient(180deg, rgb(10 16 30 / 86%), rgb(10 16 30 / 76%));
  box-shadow: 0 16px 35px rgb(2 6 23 / 32%);
}

.section-title {
  position: relative;
  padding-left: 0.85rem;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.2em;
  width: 4px;
  height: 1.2em;
  border-radius: 999px;
  background: linear-gradient(180deg, rgb(14 165 233), rgb(249 115 22));
}

.section-subtitle {
  line-height: 1.75;
}

:global(.dark .fintech-home),
:global(.dark-mode .fintech-home) {
  background:
    radial-gradient(1100px 640px at 10% -10%, rgb(56 189 248 / 10%), transparent 58%),
    radial-gradient(900px 520px at 95% -8%, rgb(249 115 22 / 7%), transparent 62%),
    rgb(2 8 23);
}

:global(.dark .bg-grid),
:global(.dark-mode .bg-grid) {
  opacity: 0.14;
  background-image:
    linear-gradient(to right, rgb(148 163 184 / 10%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(148 163 184 / 10%) 1px, transparent 1px);
}

.bg-grid {
  background-image:
    linear-gradient(to right, rgb(12 74 110 / 6%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(12 74 110 / 6%) 1px, transparent 1px);
  background-size: 36px 36px;
}

.orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(58px);
  pointer-events: none;
}

.orb-cyan {
  width: 280px;
  height: 280px;
  background: rgb(56 189 248 / 32%);
  top: 40px;
  right: 12%;
}

.orb-orange {
  width: 240px;
  height: 240px;
  background: rgb(249 115 22 / 22%);
  bottom: 8%;
  left: 10%;
}

.action-btn {
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.9rem;
  padding: 0.8rem 1.4rem;
  font-size: 1rem;
  font-weight: 600;
  transition: all 200ms ease;
}

.action-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgb(125 211 252 / 70%);
}

.action-btn-primary {
  color: #fff;
  background: linear-gradient(135deg, var(--home-primary), var(--home-secondary));
  box-shadow: 0 14px 30px rgb(14 165 233 / 22%);
}

.action-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 34px rgb(14 165 233 / 30%);
}

.action-btn-secondary {
  border: 1px solid rgb(14 165 233 / 35%);
  color: #0f172a;
  background: rgb(255 255 255 / 72%);
  backdrop-filter: blur(6px);
}

.action-btn-secondary:hover {
  border-color: rgb(14 165 233 / 60%);
  background: rgb(255 255 255 / 88%);
}

:global(.dark .action-btn-secondary),
:global(.dark-mode .action-btn-secondary) {
  border-color: rgb(71 85 105);
  color: rgb(186 230 253);
  background: rgb(15 23 42 / 82%);
}

:global(.dark .action-btn-secondary:hover),
:global(.dark-mode .action-btn-secondary:hover) {
  background: rgb(30 41 59);
  border-color: rgb(100 116 139);
}

.metric-card {
  border: 1px solid rgb(186 230 253 / 95%);
  border-radius: 0.95rem;
  background: rgb(255 255 255 / 82%);
  backdrop-filter: blur(8px);
  padding: 1rem;
  box-shadow: 0 10px 20px rgb(14 165 233 / 10%);
}

:global(.dark .metric-card),
:global(.dark-mode .metric-card) {
  border-color: rgb(71 85 105);
  background: rgb(10 16 30 / 86%);
}

.terminal-panel {
  border: 1px solid rgb(30 41 59 / 32%);
  border-radius: 1.1rem;
  overflow: hidden;
  background:
    linear-gradient(145deg, rgb(15 23 42 / 98%), rgb(30 41 59 / 94%));
  box-shadow: 0 20px 45px rgb(15 23 42 / 28%);
}

.terminal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgb(71 85 105 / 45%);
}

.row-item {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.95rem;
}

.trust-strip {
  border: 1px solid rgb(186 230 253 / 80%);
  border-radius: 1rem;
  background:
    linear-gradient(120deg, rgb(255 255 255 / 82%), rgb(224 242 254 / 72%));
  backdrop-filter: blur(8px);
  padding: 1.25rem;
  box-shadow: 0 12px 28px rgb(14 165 233 / 10%);
}

:global(.dark .trust-strip),
:global(.dark-mode .trust-strip) {
  border-color: rgb(71 85 105);
  background: rgb(10 16 30 / 86%);
}

.trust-pill {
  border: 1px solid rgb(14 165 233 / 30%);
  border-radius: 999px;
  background: rgb(224 242 254 / 64%);
  padding: 0.5rem 0.85rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--home-text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

:global(.dark .trust-pill),
:global(.dark-mode .trust-pill) {
  border-color: rgb(71 85 105);
  background: rgb(22 32 50 / 84%);
  color: rgb(186 230 253);
}

.feature-card {
  border: 1px solid rgb(186 230 253 / 82%);
  border-radius: 1rem;
  background: rgb(255 255 255 / 84%);
  backdrop-filter: blur(8px);
  padding: 1.35rem;
  position: relative;
  overflow: hidden;
  transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
}

.feature-card::after {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, rgb(14 165 233 / 95%), rgb(56 189 248 / 25%));
}

:global(.dark .feature-card),
:global(.dark-mode .feature-card) {
  border-color: rgb(71 85 105);
  background: rgb(10 16 30 / 88%);
}

.feature-card:hover {
  transform: translateY(-3px);
  border-color: rgb(14 165 233 / 45%);
  box-shadow: 0 16px 34px rgb(14 165 233 / 18%);
}

:global(.dark .feature-card:hover),
:global(.dark-mode .feature-card:hover) {
  border-color: rgb(56 189 248 / 70%);
  box-shadow: 0 14px 30px rgb(2 6 23 / 45%);
}

.feature-icon {
  width: 2rem;
  height: 2rem;
}

.story-panel {
  border: 1px solid rgb(30 41 59 / 70%);
  border-radius: 1.25rem;
  padding: 1.6rem;
  background:
    radial-gradient(900px 200px at 0% 0%, rgb(56 189 248 / 18%), transparent 60%),
    linear-gradient(145deg, rgb(2 6 23), rgb(15 23 42));
  box-shadow: 0 22px 46px rgb(2 6 23 / 38%);
}

.chapter-card {
  border: 1px solid rgb(56 189 248 / 30%);
  border-radius: 0.95rem;
  padding: 1rem;
  background: rgb(15 23 42 / 65%);
}

.chapter-label {
  color: rgb(125 211 252);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.reveal {
  animation: reveal-up 700ms ease both;
}

.reveal-2 {
  animation-delay: 120ms;
}

.reveal-3 {
  animation-delay: 220ms;
}

.reveal-4 {
  animation-delay: 300ms;
}

@keyframes reveal-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    animation: none;
  }

  .action-btn,
  .feature-card,
  .action-btn-primary {
    transition: none;
  }

  .feature-card:hover,
  .action-btn-primary:hover {
    transform: none;
  }
}

@media (min-width: 768px) {
  .section-panel {
    padding: 2rem;
  }

  .story-panel {
    padding: 2rem;
  }
}
</style>
