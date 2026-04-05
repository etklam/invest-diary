<template>
  <main class="fintech-home min-h-screen text-slate-900 dark:text-slate-100">
    <!-- Hero Section -->
    <section class="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div class="bg-grid absolute inset-0 opacity-35" aria-hidden="true" />
      <LandingOrb color="cyan" size="lg" position="top-10 right-[12%]" />
      <LandingOrb color="orange" size="md" position="bottom-8 left-[10%]" />

      <div class="relative mx-auto max-w-7xl">
        <div class="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div class="reveal">
            <LandingBadge icon="heroicons:shield-check-20-solid">
              {{ $t('home.badge') }}
            </LandingBadge>
            <h1 class="text-4xl font-semibold leading-tight text-slate-950 dark:text-slate-100 sm:text-5xl lg:text-6xl">
              {{ $t('home.hero.title') }}
            </h1>
            <p class="mt-6 max-w-2xl text-base leading-relaxed text-slate-700 dark:text-slate-300 sm:text-lg">
              {{ $t('home.hero.subtitle') }}
            </p>

            <div class="mt-8 flex flex-col gap-4 sm:flex-row">
              <NuxtLink to="/auth/register" class="action-btn action-btn-primary cursor-pointer">
                {{ $t('home.hero.getStarted') }}
                <Icon name="heroicons:arrow-up-right-20-solid" class="h-5 w-5" />
              </NuxtLink>
              <NuxtLink to="/about" class="action-btn action-btn-secondary cursor-pointer">
                {{ $t('home.hero.learnMore') }}
              </NuxtLink>
            </div>

            <dl class="mt-10 grid gap-4 sm:grid-cols-3">
              <LandingCard variant="metric" :reveal="true" :reveal-delay="2">
                <dt class="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{{ $t('home.progress.journalLabel') }}</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{{ $t('home.progress.journalValue') }}</dd>
              </LandingCard>
              <LandingCard variant="metric" :reveal="true" :reveal-delay="3">
                <dt class="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{{ $t('home.progress.reviewLabel') }}</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{{ $t('home.progress.reviewValue') }}</dd>
              </LandingCard>
              <LandingCard variant="metric" :reveal="true" :reveal-delay="4">
                <dt class="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{{ $t('home.progress.rulesLabel') }}</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{{ $t('home.progress.rulesValue') }}</dd>
              </LandingCard>
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

    <!-- Trust Section -->
    <section class="px-4 pb-20 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="trust-strip reveal">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{{ $t('home.promise.title') }}</p>
          <div class="mt-4 flex flex-wrap gap-3">
            <span v-for="pill in ['basics', 'risk', 'community', 'longTerm', 'noGuarantee']" :key="pill" class="trust-pill">
              {{ $t(`home.promise.${pill}`) }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Learning Section -->
    <LandingSection
      :title="$t('home.learning.title')"
      :subtitle="$t('home.learning.subtitle')"
      class="editorial-panel-wrapper"
    >
      <div class="split-grid">
        <div class="space-y-5">
          <LandingCard
            v-for="(key, idx) in ['basics', 'risk', 'review']"
            :key="key"
            :title="$t(`home.learning.${key}.title`)"
            :description="$t(`home.learning.${key}.description`)"
            :icon="key === 'basics' ? 'heroicons:academic-cap-20-solid' : key === 'risk' ? 'heroicons:shield-exclamation-20-solid' : 'heroicons:arrow-path-20-solid'"
            :icon-color="key === 'basics' ? 'text-sky-700' : key === 'risk' ? 'text-amber-700' : 'text-emerald-700'"
            :reveal="true"
            :reveal-delay="idx + 1"
          />
        </div>

        <div class="subpanel reveal reveal-2">
          <div class="mb-8">
            <p class="subpanel-kicker">{{ $t('home.community.title') }}</p>
            <h3 class="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
              {{ $t('home.community.subtitle') }}
            </h3>
          </div>
          <div class="space-y-4">
            <LandingCard
              v-for="key in ['share', 'feedback', 'accountability']"
              :key="key"
              variant="quiet"
              :title="$t(`home.community.${key}.title`)"
              :description="$t(`home.community.${key}.description`)"
              :icon="key === 'share' ? 'heroicons:chat-bubble-left-right-20-solid' : key === 'feedback' ? 'heroicons:hand-thumb-up-20-solid' : 'heroicons:user-group-20-solid'"
              :icon-color="key === 'share' ? 'text-cyan-700' : key === 'feedback' ? 'text-indigo-700' : 'text-rose-700'"
            />
          </div>
        </div>
      </div>

      <div class="mt-12 reveal">
        <p class="subpanel-kicker">{{ $t('home.turnaround.title') }}</p>
        <h3 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-3xl">
          {{ $t('home.turnaround.subtitle') }}
        </h3>
        <div class="sequence-grid mt-8">
          <LandingCard
            v-for="n in 4"
            :key="n"
            variant="number"
            :number="`0${n}`"
            :title="$t(`home.turnaround.step${n}.title`)"
            :description="$t(`home.turnaround.step${n}.description`)"
            :reveal="true"
            :reveal-delay="n"
          />
        </div>
      </div>
    </LandingSection>

    <!-- Features Section -->
    <LandingSection
      :title="$t('home.features.title')"
      :subtitle="$t('home.features.subtitle')"
    >
      <div class="feature-grid">
        <LandingCard
          variant="featured"
          :title="$t('home.features.diary.title')"
          :description="$t('home.features.diary.description')"
          icon="heroicons:book-open-20-solid"
          icon-color="text-sky-700"
          :reveal="true"
        />
        <LandingCard
          v-for="(feat, idx) in [
            { key: 'stocks', icon: 'heroicons:chart-bar-square-20-solid', color: 'text-emerald-700' },
            { key: 'alerts', icon: 'heroicons:bell-alert-20-solid', color: 'text-orange-700' },
            { key: 'timeline', icon: 'heroicons:clock-20-solid', color: 'text-indigo-700' },
            { key: 'security', icon: 'heroicons:lock-closed-20-solid', color: 'text-rose-700' },
            { key: 'themes', icon: 'heroicons:moon-20-solid', color: 'text-cyan-700' }
          ]"
          :key="feat.key"
          :title="$t(`home.features.${feat.key}.title`)"
          :description="$t(`home.features.${feat.key}.description`)"
          :icon="feat.icon"
          :icon-color="feat.color"
          :reveal="true"
          :reveal-delay="(idx % 3) + 1"
        />
      </div>
    </LandingSection>

    <!-- CTA Section -->
    <section class="px-4 pb-24 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="story-panel reveal">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <h2 class="text-2xl font-semibold text-slate-50 sm:text-3xl">{{ $t('home.cta.title') }}</h2>
            <NuxtLink to="/auth/login" class="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition-colors duration-200 hover:text-cyan-100 cursor-pointer">
              {{ $t('home.cta.login') }}
              <Icon name="heroicons:arrow-right-20-solid" class="h-4 w-4" />
            </NuxtLink>
          </div>
          <p class="mt-4 max-w-3xl text-base text-slate-300 sm:text-lg">
            {{ $t('home.cta.description') }}
          </p>
          <div class="mt-8 grid gap-4 md:grid-cols-3">
            <article v-for="n in 3" :key="n" class="chapter-card">
              <p class="chapter-label">{{ $t(`home.cta.step${n}.label`) }}</p>
              <h3 class="mt-2 text-lg font-semibold text-white">{{ $t(`home.cta.step${n}.title`) }}</h3>
              <p class="mt-2 text-sm text-slate-300">{{ $t(`home.cta.step${n}.description`) }}</p>
            </article>
          </div>
          <p class="mt-6 text-sm leading-6 text-slate-300">
            {{ $t('home.cta.disclaimer') }}
          </p>
          <NuxtLink to="/auth/register" class="mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-3 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-400 cursor-pointer">
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
          <NuxtLink to="/about" class="transition-colors duration-200 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer">
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

:global(.dark .fintech-home),
:global(.dark-mode .fintech-home) {
  background:
    radial-gradient(1100px 640px at 10% -10%, rgb(56 189 248 / 10%), transparent 58%),
    radial-gradient(900px 520px at 95% -8%, rgb(249 115 22 / 7%), transparent 62%),
    rgb(2 8 23);
}

.bg-grid {
  background-image:
    linear-gradient(to right, rgb(12 74 110 / 6%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(12 74 110 / 6%) 1px, transparent 1px);
  background-size: 36px 36px;
}

:global(.dark .bg-grid),
:global(.dark-mode .bg-grid) {
  opacity: 0.14;
  background-image:
    linear-gradient(to right, rgb(148 163 184 / 10%) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(148 163 184 / 10%) 1px, transparent 1px);
}

.editorial-panel-wrapper :deep(.section-panel) {
  background: linear-gradient(180deg, rgb(255 255 255 / 82%), rgb(248 250 252 / 74%));
}

:global(.dark .editorial-panel-wrapper :deep(.section-panel)),
:global(.dark-mode .editorial-panel-wrapper :deep(.section-panel)) {
  background: linear-gradient(180deg, rgb(10 16 30 / 88%), rgb(8 15 28 / 80%));
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

:global(.dark .action-btn-secondary),
:global(.dark-mode .action-btn-secondary) {
  border-color: rgb(71 85 105);
  color: rgb(186 230 253);
  background: rgb(15 23 42 / 82%);
}

.terminal-panel {
  border: 1px solid rgb(30 41 59 / 32%);
  border-radius: 1.1rem;
  overflow: hidden;
  background: linear-gradient(145deg, rgb(15 23 42 / 98%), rgb(30 41 59 / 94%));
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
  background: linear-gradient(120deg, rgb(255 255 255 / 82%), rgb(224 242 254 / 72%));
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

.subpanel {
  border: 1px solid rgb(186 230 253 / 80%);
  border-radius: 1.15rem;
  padding: 1.5rem;
  background: linear-gradient(180deg, rgb(255 255 255 / 92%), rgb(240 249 255 / 72%));
}

:global(.dark .subpanel),
:global(.dark-mode .subpanel) {
  border-color: rgb(51 65 85);
  background: linear-gradient(180deg, rgb(7 14 27 / 92%), rgb(10 16 30 / 78%));
}

.subpanel-kicker {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(14 116 144);
}

.split-grid { display: grid; gap: 1.5rem; }
.sequence-grid { display: grid; gap: 1rem; }
.feature-grid { display: grid; gap: 1.25rem; }

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

.reveal { animation: reveal-up 700ms ease both; }
.reveal-2 { animation-delay: 120ms; }

@keyframes reveal-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (min-width: 768px) {
  .story-panel { padding: 2rem; }
  .sequence-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  :deep(.feature-card-featured) { grid-column: span 2; }
}

@media (min-width: 1024px) {
  .split-grid { grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr); }
  .feature-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  :deep(.feature-card-featured) { grid-column: span 1; grid-row: span 2; }
  .sequence-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
</style>
