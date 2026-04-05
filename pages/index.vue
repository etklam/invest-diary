<template>
  <main class="fintech-home min-h-screen text-slate-900 dark:text-slate-100">
    <!-- Hero Section -->
    <section class="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div class="bg-grid absolute inset-0 opacity-35" aria-hidden="true" />

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
      <div class="workflow-grid">
        <article class="workflow-lead reveal">
          <p class="subpanel-kicker">{{ $t('home.features.diary.title') }}</p>
          <h3 class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
            {{ $t('home.features.diary.description') }}
          </h3>
          <p class="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {{ $t('home.snapshot.description') }}
          </p>

          <div class="workflow-sequence">
            <article v-for="n in 4" :key="n" class="workflow-step">
              <p class="workflow-step-number">{{ `0${n}` }}</p>
              <h4 class="workflow-step-title">{{ $t(`home.turnaround.step${n}.title`) }}</h4>
              <p class="workflow-step-text">{{ $t(`home.turnaround.step${n}.description`) }}</p>
            </article>
          </div>
        </article>

        <div class="workflow-sidebar">
          <article
            v-for="(feat, idx) in workflowFeatures"
            :key="feat.key"
            class="workflow-tool reveal"
            :class="idx % 2 === 1 ? 'reveal-2' : ''"
          >
            <div class="workflow-tool-icon">
              <Icon :name="feat.icon" class="h-5 w-5" />
            </div>
            <div>
              <p class="workflow-tool-title">{{ $t(`home.features.${feat.key}.title`) }}</p>
              <p class="workflow-tool-text">{{ $t(`home.features.${feat.key}.description`) }}</p>
            </div>
          </article>
        </div>
      </div>

      <div class="workflow-footnote reveal">
        <p class="subpanel-kicker">{{ $t('home.promise.title') }}</p>
        <div class="mt-4 flex flex-wrap gap-3">
          <span v-for="pill in promisePills" :key="pill" class="trust-pill">
            {{ $t(`home.promise.${pill}`) }}
          </span>
        </div>
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

const workflowFeatures = [
  { key: 'stocks', icon: 'heroicons:chart-bar-square-20-solid' },
  { key: 'alerts', icon: 'heroicons:bell-alert-20-solid' },
  { key: 'timeline', icon: 'heroicons:clock-20-solid' },
  { key: 'security', icon: 'heroicons:lock-closed-20-solid' },
  { key: 'themes', icon: 'heroicons:moon-20-solid' }
]

const promisePills = ['basics', 'risk', 'community', 'longTerm', 'noGuarantee']
</script>

<style scoped>
.fintech-home {
  --home-primary: var(--color-primary);
  --home-secondary: var(--color-secondary);
  --home-cta: var(--color-secondary);
  --home-bg: var(--color-background);
  --home-text: var(--color-text);
  font-family: var(--font-body);
  background:
    radial-gradient(1200px 700px at 12% -10%, color-mix(in srgb, var(--color-secondary) 12%, transparent), transparent 58%),
    radial-gradient(1100px 620px at 95% -5%, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent 62%),
    var(--home-bg);
}

:global(.dark .fintech-home),
:global(.dark-mode .fintech-home) {
  background:
    radial-gradient(1100px 640px at 10% -10%, color-mix(in srgb, var(--color-secondary) 10%, transparent), transparent 58%),
    radial-gradient(900px 520px at 95% -8%, color-mix(in srgb, var(--color-primary) 8%, transparent), transparent 62%),
    var(--color-background);
}

.bg-grid {
  background-image: radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--color-primary) 10%, transparent) 1px, transparent 0);
  background-size: 34px 34px;
}

:global(.dark .bg-grid),
:global(.dark-mode .bg-grid) {
  opacity: 0.22;
}

.editorial-panel-wrapper :deep(.section-panel) {
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-secondary) 12%, transparent), transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 88%, transparent), color-mix(in srgb, var(--color-surface-strong) 84%, transparent));
}

.fintech-home :is(h1, h2, h3) {
  font-family: var(--font-display);
  letter-spacing: -0.025em;
}

.action-btn {
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 999px;
  padding: 0.8rem 1.4rem;
  font-size: 1rem;
  font-weight: 600;
  transition: all 200ms ease;
}

.action-btn-primary {
  color: #fff;
  background: var(--home-primary);
  box-shadow: 0 16px 28px color-mix(in srgb, var(--home-primary) 26%, transparent);
}

.action-btn-primary:hover {
  transform: translateY(-2px);
  background: var(--color-primary-active);
  box-shadow: 0 22px 36px color-mix(in srgb, var(--home-primary) 34%, transparent);
}

.action-btn-secondary {
  border: 1px solid var(--color-border);
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-surface) 82%, transparent);
  backdrop-filter: blur(6px);
}

:global(.dark .action-btn-secondary),
:global(.dark-mode .action-btn-secondary) {
  border-color: var(--color-border);
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
}

.terminal-panel {
  border: 1px solid color-mix(in srgb, var(--color-border) 36%, transparent);
  border-radius: 1.35rem;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-secondary) 18%, transparent), transparent 30%),
    linear-gradient(145deg, #132739, #1e3445 58%, #213847);
  box-shadow: 0 20px 45px rgba(12, 18, 24, 0.24);
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: linear-gradient(120deg, color-mix(in srgb, var(--color-surface) 82%, transparent), color-mix(in srgb, var(--color-surface-strong) 76%, transparent));
  backdrop-filter: blur(8px);
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
}

:global(.dark .trust-strip),
:global(.dark-mode .trust-strip) {
  border-color: var(--color-border);
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
}

.trust-pill {
  border: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-surface-strong) 68%, transparent);
  padding: 0.5rem 0.85rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

:global(.dark .trust-pill),
:global(.dark-mode .trust-pill) {
  border-color: var(--color-border);
  background: color-mix(in srgb, var(--color-surface-strong) 88%, transparent);
  color: var(--color-text);
}

.subpanel {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 90%, transparent), color-mix(in srgb, var(--color-surface-strong) 82%, transparent));
}

:global(.dark .subpanel),
:global(.dark-mode .subpanel) {
  border-color: var(--color-border);
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 96%, transparent), color-mix(in srgb, var(--color-surface-strong) 100%, transparent));
}

:global(.dark .workflow-lead),
:global(.dark .workflow-tool),
:global(.dark .workflow-footnote),
:global(.dark-mode .workflow-lead),
:global(.dark-mode .workflow-tool),
:global(.dark-mode .workflow-footnote) {
  border-color: var(--color-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 96%, transparent), color-mix(in srgb, var(--color-surface-strong) 100%, transparent));
}

.subpanel-kicker {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.split-grid { display: grid; gap: 1.5rem; }
.sequence-grid { display: grid; gap: 1rem; }
.workflow-grid { display: grid; gap: 1.25rem; }

.workflow-lead,
.workflow-tool,
.workflow-footnote {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 90%, transparent), color-mix(in srgb, var(--color-surface-strong) 84%, transparent));
}

.workflow-lead {
  padding: 1.5rem;
}

.workflow-sequence {
  display: grid;
  gap: 0.9rem;
  margin-top: 1.5rem;
}

.workflow-step {
  border-top: 1px solid color-mix(in srgb, var(--color-border) 90%, transparent);
  padding-top: 0.9rem;
}

.workflow-step:first-child {
  border-top: none;
  padding-top: 0;
}

.workflow-step-number,
.workflow-tool-title {
  font-family: var(--font-data);
}

.workflow-step-number {
  color: var(--color-secondary);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.workflow-step-title {
  margin-top: 0.35rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text);
}

.workflow-step-text,
.workflow-tool-text {
  margin-top: 0.35rem;
  line-height: 1.7;
  color: var(--color-text-muted);
}

.workflow-sidebar {
  display: grid;
  gap: 0.9rem;
}

.workflow-tool {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.9rem;
  align-items: flex-start;
  padding: 1rem;
}

.workflow-tool-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-secondary) 14%, transparent);
}

.workflow-tool-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-secondary);
}

.workflow-footnote {
  margin-top: 1.25rem;
  padding: 1.25rem;
}

.story-panel {
  border: 1px solid color-mix(in srgb, var(--color-border) 28%, transparent);
  border-radius: var(--radius-lg);
  padding: 1.6rem;
  background:
    radial-gradient(900px 200px at 0% 0%, color-mix(in srgb, var(--color-secondary) 18%, transparent), transparent 60%),
    linear-gradient(145deg, #111720, #17212a);
  box-shadow: 0 22px 46px rgba(2, 6, 23, 0.28);
}

.chapter-card {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-md);
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
}

.chapter-label {
  color: color-mix(in srgb, white 72%, var(--color-secondary));
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
  .workflow-sequence { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 1024px) {
  .split-grid { grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr); }
  .workflow-grid { grid-template-columns: minmax(0, 1.18fr) minmax(280px, 0.82fr); }
  .sequence-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
</style>
