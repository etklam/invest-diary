<template>
  <main class="how-to-use-page min-h-screen text-slate-900 dark:text-slate-100">
    <section class="relative overflow-hidden px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
      <div class="bg-grid absolute inset-0 opacity-30" aria-hidden="true" />
      <div class="orb orb-cyan" aria-hidden="true" />
      <div class="orb orb-amber" aria-hidden="true" />

      <div class="relative mx-auto max-w-7xl">
        <div class="hero-shell">
          <div class="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p class="inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-white/78 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 backdrop-blur dark:border-sky-700/60 dark:bg-slate-900/80 dark:text-sky-200">
                <Icon name="heroicons:map-20-solid" class="h-4 w-4 text-sky-600 dark:text-sky-300" />
                {{ $t('howToUse.badge') }}
              </p>
              <h1 class="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-slate-950 dark:text-slate-100 sm:text-5xl lg:text-6xl">
                {{ $t('howToUse.hero.title') }}
              </h1>
              <p class="mt-6 max-w-3xl text-base leading-8 text-slate-700 dark:text-slate-300 sm:text-lg">
                {{ $t('howToUse.hero.subtitle') }}
              </p>

              <div class="mt-8 flex flex-col gap-4 sm:flex-row">
                <NuxtLink
                  :to="primaryLink"
                  class="action-btn action-btn-primary cursor-pointer"
                >
                  {{ isAuthenticated ? $t('howToUse.cta.primaryAuth') : $t('howToUse.cta.primaryGuest') }}
                  <Icon name="heroicons:arrow-up-right-20-solid" class="h-5 w-5" />
                </NuxtLink>
                <NuxtLink
                  to="/about"
                  class="action-btn action-btn-secondary cursor-pointer"
                >
                  {{ $t('howToUse.cta.secondary') }}
                </NuxtLink>
              </div>
            </div>

            <aside class="workflow-board reveal reveal-2">
              <p class="board-label">{{ $t('howToUse.workflow.title') }}</p>
              <div class="mt-5 space-y-3">
                <article class="board-step">
                  <span class="board-index">01</span>
                  <div>
                    <p class="board-step-label">{{ $t('howToUse.workflow.step1.label') }}</p>
                    <p class="board-step-title">{{ $t('howToUse.workflow.step1.title') }}</p>
                  </div>
                </article>
                <article class="board-step">
                  <span class="board-index">02</span>
                  <div>
                    <p class="board-step-label">{{ $t('howToUse.workflow.step2.label') }}</p>
                    <p class="board-step-title">{{ $t('howToUse.workflow.step2.title') }}</p>
                  </div>
                </article>
                <article class="board-step">
                  <span class="board-index">03</span>
                  <div>
                    <p class="board-step-label">{{ $t('howToUse.workflow.step3.label') }}</p>
                    <p class="board-step-title">{{ $t('howToUse.workflow.step3.title') }}</p>
                  </div>
                </article>
                <article class="board-step">
                  <span class="board-index">04</span>
                  <div>
                    <p class="board-step-label">{{ $t('howToUse.workflow.step4.label') }}</p>
                    <p class="board-step-title">{{ $t('howToUse.workflow.step4.title') }}</p>
                  </div>
                </article>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6">
      <div class="section-panel mx-auto max-w-7xl">
        <div class="section-copy reveal">
          <h2 class="section-title text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            {{ $t('howToUse.gettingStarted.title') }}
          </h2>
          <p class="section-subtitle mt-3 max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ $t('howToUse.gettingStarted.subtitle') }}
          </p>
        </div>

        <div class="mt-10 grid gap-5 lg:grid-cols-3">
          <article class="guide-card reveal">
            <p class="guide-eyebrow">{{ $t('howToUse.gettingStarted.step1.eyebrow') }}</p>
            <h3 class="mt-3 text-xl font-semibold text-slate-950 dark:text-slate-100">
              {{ $t('howToUse.gettingStarted.step1.title') }}
            </h3>
            <p class="mt-3 text-slate-600 dark:text-slate-300">
              {{ $t('howToUse.gettingStarted.step1.description') }}
            </p>
            <NuxtLink to="/auth/register" class="guide-link cursor-pointer">
              {{ $t('howToUse.gettingStarted.step1.cta') }}
              <Icon name="heroicons:arrow-right-20-solid" class="h-4 w-4" />
            </NuxtLink>
          </article>

          <article class="guide-card reveal reveal-2">
            <p class="guide-eyebrow">{{ $t('howToUse.gettingStarted.step2.eyebrow') }}</p>
            <h3 class="mt-3 text-xl font-semibold text-slate-950 dark:text-slate-100">
              {{ $t('howToUse.gettingStarted.step2.title') }}
            </h3>
            <p class="mt-3 text-slate-600 dark:text-slate-300">
              {{ $t('howToUse.gettingStarted.step2.description') }}
            </p>
            <NuxtLink :to="workspaceLink" class="guide-link cursor-pointer">
              {{ $t('howToUse.gettingStarted.step2.cta') }}
              <Icon name="heroicons:arrow-right-20-solid" class="h-4 w-4" />
            </NuxtLink>
          </article>

          <article class="guide-card reveal reveal-3">
            <p class="guide-eyebrow">{{ $t('howToUse.gettingStarted.step3.eyebrow') }}</p>
            <h3 class="mt-3 text-xl font-semibold text-slate-950 dark:text-slate-100">
              {{ $t('howToUse.gettingStarted.step3.title') }}
            </h3>
            <p class="mt-3 text-slate-600 dark:text-slate-300">
              {{ $t('howToUse.gettingStarted.step3.description') }}
            </p>
            <NuxtLink :to="settingsLink" class="guide-link cursor-pointer">
              {{ $t('howToUse.gettingStarted.step3.cta') }}
              <Icon name="heroicons:arrow-right-20-solid" class="h-4 w-4" />
            </NuxtLink>
          </article>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6">
      <div class="section-panel mx-auto max-w-7xl">
        <div class="section-copy reveal">
          <h2 class="section-title text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            {{ $t('howToUse.workflow.title') }}
          </h2>
          <p class="section-subtitle mt-3 max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ $t('howToUse.workflow.subtitle') }}
          </p>
        </div>

        <div class="mt-10 grid gap-4 lg:grid-cols-2">
          <article class="sequence-card reveal">
            <p class="sequence-label">{{ $t('howToUse.workflow.step1.label') }}</p>
            <h3 class="sequence-title">{{ $t('howToUse.workflow.step1.title') }}</h3>
            <p class="sequence-copy">{{ $t('howToUse.workflow.step1.description') }}</p>
          </article>
          <article class="sequence-card reveal reveal-2">
            <p class="sequence-label">{{ $t('howToUse.workflow.step2.label') }}</p>
            <h3 class="sequence-title">{{ $t('howToUse.workflow.step2.title') }}</h3>
            <p class="sequence-copy">{{ $t('howToUse.workflow.step2.description') }}</p>
          </article>
          <article class="sequence-card reveal reveal-3">
            <p class="sequence-label">{{ $t('howToUse.workflow.step3.label') }}</p>
            <h3 class="sequence-title">{{ $t('howToUse.workflow.step3.title') }}</h3>
            <p class="sequence-copy">{{ $t('howToUse.workflow.step3.description') }}</p>
          </article>
          <article class="sequence-card reveal reveal-4">
            <p class="sequence-label">{{ $t('howToUse.workflow.step4.label') }}</p>
            <h3 class="sequence-title">{{ $t('howToUse.workflow.step4.title') }}</h3>
            <p class="sequence-copy">{{ $t('howToUse.workflow.step4.description') }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="px-4 pb-24 sm:px-6">
      <div class="section-panel mx-auto max-w-7xl">
        <div class="section-copy reveal">
          <h2 class="section-title text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            {{ $t('howToUse.surfaces.title') }}
          </h2>
          <p class="section-subtitle mt-3 max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ $t('howToUse.surfaces.subtitle') }}
          </p>
        </div>

        <div class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <article class="surface-card reveal">
            <p class="surface-kicker">{{ $t('quickDiary.title') }}</p>
            <h3 class="surface-title">{{ $t('howToUse.surfaces.quickNotes.title') }}</h3>
            <p class="surface-copy">{{ $t('howToUse.surfaces.quickNotes.description') }}</p>
          </article>
          <article class="surface-card reveal reveal-2">
            <p class="surface-kicker">{{ $t('nav.diaries') }}</p>
            <h3 class="surface-title">{{ $t('howToUse.surfaces.diaries.title') }}</h3>
            <p class="surface-copy">{{ $t('howToUse.surfaces.diaries.description') }}</p>
          </article>
          <article class="surface-card reveal reveal-3">
            <p class="surface-kicker">{{ $t('nav.timeline') }}</p>
            <h3 class="surface-title">{{ $t('howToUse.surfaces.timeline.title') }}</h3>
            <p class="surface-copy">{{ $t('howToUse.surfaces.timeline.description') }}</p>
          </article>
          <article class="surface-card reveal reveal-4">
            <p class="surface-kicker">{{ $t('nav.alerts') }}</p>
            <h3 class="surface-title">{{ $t('howToUse.surfaces.alerts.title') }}</h3>
            <p class="surface-copy">{{ $t('howToUse.surfaces.alerts.description') }}</p>
          </article>
          <article class="surface-card reveal">
            <p class="surface-kicker">{{ $t('compareDiary.kicker') }}</p>
            <h3 class="surface-title">{{ $t('howToUse.surfaces.compare.title') }}</h3>
            <p class="surface-copy">{{ $t('howToUse.surfaces.compare.description') }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="px-4 pb-24 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="cta-panel reveal">
          <div class="max-w-3xl">
            <h2 class="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
              {{ $t('howToUse.cta.title') }}
            </h2>
            <p class="mt-4 text-base leading-8 text-slate-300 sm:text-lg">
              {{ $t('howToUse.cta.description') }}
            </p>
          </div>
          <div class="mt-8 flex flex-col gap-4 sm:flex-row">
            <NuxtLink
              :to="primaryLink"
              class="action-btn cta-primary cursor-pointer"
            >
              {{ isAuthenticated ? $t('howToUse.cta.primaryAuth') : $t('howToUse.cta.primaryGuest') }}
              <Icon name="heroicons:arrow-up-right-20-solid" class="h-5 w-5" />
            </NuxtLink>
            <NuxtLink to="/about" class="action-btn cta-secondary cursor-pointer">
              {{ $t('howToUse.cta.secondary') }}
            </NuxtLink>
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
  font-family: 'IBM Plex Sans', 'Avenir Next', 'Segoe UI', sans-serif;
  background:
    radial-gradient(1200px 700px at 12% -10%, rgb(56 189 248 / 16%), transparent 58%),
    radial-gradient(1000px 600px at 95% -5%, rgb(245 158 11 / 11%), transparent 62%),
    rgb(248 250 252);
}

:global(.dark .how-to-use-page),
:global(.dark-mode .how-to-use-page) {
  background:
    radial-gradient(1100px 640px at 10% -10%, rgb(56 189 248 / 9%), transparent 58%),
    radial-gradient(900px 520px at 95% -8%, rgb(245 158 11 / 7%), transparent 62%),
    rgb(2 8 23);
}

.bg-grid {
  background-image:
    linear-gradient(to right, rgb(15 23 42 / 5%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(15 23 42 / 5%) 1px, transparent 1px);
  background-size: 36px 36px;
}

:global(.dark .bg-grid),
:global(.dark-mode .bg-grid) {
  background-image:
    linear-gradient(to right, rgb(148 163 184 / 10%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(148 163 184 / 10%) 1px, transparent 1px);
}

.orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(58px);
  pointer-events: none;
}

.orb-cyan {
  width: 260px;
  height: 260px;
  background: rgb(56 189 248 / 26%);
  top: 32px;
  right: 8%;
}

.orb-amber {
  width: 240px;
  height: 240px;
  background: rgb(245 158 11 / 18%);
  bottom: 10%;
  left: 8%;
}

.hero-shell,
.section-panel {
  border: 1px solid rgb(226 232 240 / 95%);
  border-radius: 1.5rem;
  background: linear-gradient(180deg, rgb(255 255 255 / 88%), rgb(255 255 255 / 74%));
  box-shadow: 0 22px 45px rgb(15 23 42 / 8%);
  backdrop-filter: blur(10px);
}

.hero-shell {
  padding: 1.5rem;
}

.section-panel {
  padding: 1.5rem;
}

:global(.dark .hero-shell),
:global(.dark .section-panel),
:global(.dark-mode .hero-shell),
:global(.dark-mode .section-panel) {
  border-color: rgb(51 65 85 / 95%);
  background: linear-gradient(180deg, rgb(8 15 28 / 88%), rgb(8 15 28 / 78%));
  box-shadow: 0 24px 48px rgb(2 6 23 / 34%);
}

.section-title {
  letter-spacing: -0.03em;
}

.section-subtitle {
  line-height: 1.8;
}

.action-btn {
  display: inline-flex;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.95rem;
  padding: 0.85rem 1.4rem;
  font-size: 1rem;
  font-weight: 600;
  transition: background-color 200ms ease, border-color 200ms ease, color 200ms ease, box-shadow 200ms ease;
}

.action-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgb(125 211 252 / 55%);
}

.action-btn-primary,
.cta-primary {
  background: rgb(15 23 42);
  color: rgb(248 250 252);
  box-shadow: 0 14px 28px rgb(15 23 42 / 18%);
}

.action-btn-primary:hover,
.cta-primary:hover {
  background: rgb(30 41 59);
}

.action-btn-secondary,
.cta-secondary {
  border: 1px solid rgb(148 163 184 / 45%);
  background: rgb(255 255 255 / 76%);
  color: rgb(15 23 42);
}

.action-btn-secondary:hover,
.cta-secondary:hover {
  border-color: rgb(100 116 139 / 60%);
  background: rgb(255 255 255 / 92%);
}

:global(.dark .action-btn-secondary),
:global(.dark .cta-secondary),
:global(.dark-mode .action-btn-secondary),
:global(.dark-mode .cta-secondary) {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42 / 82%);
  color: rgb(226 232 240);
}

:global(.dark .action-btn-secondary:hover),
:global(.dark .cta-secondary:hover),
:global(.dark-mode .action-btn-secondary:hover),
:global(.dark-mode .cta-secondary:hover) {
  background: rgb(30 41 59);
}

.workflow-board {
  border: 1px solid rgb(15 23 42 / 8%);
  border-radius: 1.25rem;
  background:
    linear-gradient(165deg, rgb(15 23 42), rgb(30 41 59));
  padding: 1.25rem;
  box-shadow: 0 18px 42px rgb(15 23 42 / 24%);
}

.board-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(125 211 252);
}

.board-step {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.9rem;
  border: 1px solid rgb(148 163 184 / 18%);
  border-radius: 1rem;
  background: rgb(255 255 255 / 5%);
  padding: 0.95rem;
}

.board-index {
  display: inline-flex;
  height: 2.1rem;
  width: 2.1rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(14 165 233 / 18%);
  color: rgb(186 230 253);
  font-size: 0.8rem;
  font-weight: 700;
}

.board-step-label {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(251 191 36);
}

.board-step-title {
  margin-top: 0.3rem;
  color: rgb(241 245 249);
  line-height: 1.6;
}

.guide-card,
.sequence-card,
.surface-card {
  border: 1px solid rgb(226 232 240);
  border-radius: 1.15rem;
  background: rgb(255 255 255 / 88%);
  padding: 1.25rem;
  transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
}

.guide-card:hover,
.sequence-card:hover,
.surface-card:hover {
  transform: translateY(-2px);
  border-color: rgb(125 211 252 / 80%);
  box-shadow: 0 16px 34px rgb(15 23 42 / 10%);
}

:global(.dark .guide-card),
:global(.dark .sequence-card),
:global(.dark .surface-card),
:global(.dark-mode .guide-card),
:global(.dark-mode .sequence-card),
:global(.dark-mode .surface-card) {
  border-color: rgb(51 65 85);
  background: rgb(7 14 27 / 88%);
}

.guide-eyebrow,
.sequence-label,
.surface-kicker {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(14 116 144);
}

.guide-link {
  margin-top: 1.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgb(3 105 161);
  transition: color 200ms ease;
}

.guide-link:hover {
  color: rgb(14 165 233);
}

.sequence-title,
.surface-title {
  margin-top: 0.7rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: rgb(15 23 42);
}

.sequence-copy,
.surface-copy {
  margin-top: 0.75rem;
  line-height: 1.75;
  color: rgb(71 85 105);
}

:global(.dark .sequence-title),
:global(.dark .surface-title),
:global(.dark-mode .sequence-title),
:global(.dark-mode .surface-title) {
  color: rgb(241 245 249);
}

:global(.dark .sequence-copy),
:global(.dark .surface-copy),
:global(.dark-mode .sequence-copy),
:global(.dark-mode .surface-copy) {
  color: rgb(203 213 225);
}

.cta-panel {
  border: 1px solid rgb(30 41 59 / 72%);
  border-radius: 1.5rem;
  background:
    radial-gradient(800px 220px at 0% 0%, rgb(56 189 248 / 16%), transparent 60%),
    linear-gradient(145deg, rgb(2 6 23), rgb(15 23 42));
  padding: 1.75rem;
  box-shadow: 0 24px 48px rgb(2 6 23 / 38%);
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

  .guide-card,
  .sequence-card,
  .surface-card,
  .action-btn {
    transition: none;
  }

  .guide-card:hover,
  .sequence-card:hover,
  .surface-card:hover {
    transform: none;
  }
}

@media (min-width: 768px) {
  .hero-shell,
  .section-panel,
  .cta-panel {
    padding: 2rem;
  }
}
</style>
