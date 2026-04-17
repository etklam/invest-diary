<template>
  <main class="about-page min-h-screen text-slate-900 dark:text-slate-100">
    <section class="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div class="bg-grid absolute inset-0 opacity-35" aria-hidden="true" />

      <div class="relative mx-auto max-w-7xl">
        <div class="grid items-start gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div class="reveal">
            <LandingBadge icon="heroicons:user-circle-20-solid">
              {{ $t('about.badge') }}
            </LandingBadge>
            <h1 class="text-4xl font-semibold leading-tight text-slate-950 dark:text-slate-100 sm:text-5xl lg:text-6xl">
              {{ $t('about.hero.title') }}
            </h1>
            <p class="mt-6 max-w-2xl text-base leading-relaxed text-slate-700 dark:text-slate-300 sm:text-lg">
              {{ $t('about.hero.subtitle') }}
            </p>

            <div class="mt-8 flex flex-col gap-4 sm:flex-row">
              <NuxtLink to="/auth/register" class="action-btn action-btn-primary cursor-pointer">
                {{ $t('home.hero.getStarted') }}
                <Icon name="heroicons:arrow-up-right-20-solid" class="h-5 w-5" />
              </NuxtLink>
              <NuxtLink to="/how-to-use" class="action-btn action-btn-secondary cursor-pointer">
                {{ $t('home.hero.learnMore') }}
              </NuxtLink>
            </div>
          </div>

          <div class="reveal reveal-2">
            <div class="profile-panel">
              <header class="profile-head">
                <span class="font-medium">{{ $t('about.personal.title') }}</span>
                <span class="profile-status">
                  {{ $t('about.features.security.title') }}
                </span>
              </header>
              <div class="space-y-4 p-5">
                <article v-for="entry in heroNotes" :key="entry.titleKey" class="profile-entry">
                  <p class="profile-entry-label">{{ $t(entry.titleKey) }}</p>
                  <p class="profile-entry-text">{{ $t(entry.bodyKey) }}</p>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="trust-strip reveal">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {{ $t('home.promise.title') }}
          </p>
          <div class="mt-4 flex flex-wrap gap-3">
            <span v-for="pill in promisePills" :key="pill" class="trust-pill">
              {{ $t(`home.promise.${pill}`) }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <LandingSection
      :title="$t('about.features.title')"
      :subtitle="$t('about.features.subtitle')"
      class="editorial-panel-wrapper"
    >
      <div class="workflow-grid">
        <article class="workflow-lead reveal">
          <p class="subpanel-kicker">{{ $t('about.intro.title') }}</p>
          <h3 class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
            {{ $t('about.motivation.title') }}
          </h3>
          <p class="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {{ $t('about.intro.content') }}
          </p>

          <div class="workflow-sequence">
            <article v-for="(feature, idx) in coreFeatures" :key="feature.key" class="workflow-step">
              <p class="workflow-step-number">{{ `0${idx + 1}` }}</p>
              <h4 class="workflow-step-title">{{ $t(`about.features.${feature.key}.title`) }}</h4>
              <p class="workflow-step-text">{{ $t(`about.features.${feature.key}.description`) }}</p>
            </article>
          </div>
        </article>

        <div class="workflow-sidebar">
          <article
            v-for="(feature, idx) in supportFeatures"
            :key="feature.key"
            class="workflow-tool reveal"
            :class="idx % 2 === 1 ? 'reveal-2' : ''"
          >
            <div class="workflow-tool-icon">
              <Icon :name="feature.icon" class="h-5 w-5" />
            </div>
            <div>
              <p class="workflow-tool-title">{{ $t(`about.features.${feature.key}.title`) }}</p>
              <p class="workflow-tool-text">{{ $t(`about.features.${feature.key}.description`) }}</p>
            </div>
          </article>
        </div>
      </div>

      <div class="workflow-footnote reveal">
        <p class="subpanel-kicker">{{ $t('about.personal.title') }}</p>
        <h3 class="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
          {{ $t('about.features.security.title') }}
        </h3>
        <p class="mt-4 max-w-4xl text-base leading-7 text-slate-600 dark:text-slate-300">
          {{ $t('about.motivation.paragraph2') }}
        </p>
      </div>
    </LandingSection>

    <LandingSection
      :title="$t('about.tech.title')"
      :subtitle="$t('about.tech.subtitle')"
    >
      <div class="split-grid">
        <div class="subpanel reveal">
          <p class="subpanel-kicker">{{ $t('about.tech.title') }}</p>
          <h3 class="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
            {{ $t('about.features.security.title') }}
          </h3>
          <p class="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            {{ $t('about.features.security.description') }}
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <span v-for="tech in techStack" :key="tech" class="trust-pill">
              {{ tech }}
            </span>
          </div>
        </div>

        <div class="subpanel reveal reveal-2">
          <p class="subpanel-kicker">{{ $t('about.personal.title') }}</p>
          <h3 class="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
            {{ $t('about.hero.subtitle') }}
          </h3>
          <p class="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            {{ $t('about.personal.content') }}
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <span v-for="pill in promisePills" :key="`principle-${pill}`" class="trust-pill">
              {{ $t(`home.promise.${pill}`) }}
            </span>
          </div>
        </div>
      </div>
    </LandingSection>

    <section class="px-4 pb-24 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="story-panel reveal">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <h2 class="text-2xl font-semibold sm:text-3xl">{{ $t('home.cta.title') }}</h2>
            <NuxtLink to="/auth/login" class="story-link inline-flex items-center gap-2 text-sm font-semibold transition-colors duration-200 cursor-pointer">
              {{ $t('home.cta.login') }}
              <Icon name="heroicons:arrow-right-20-solid" class="h-4 w-4" />
            </NuxtLink>
          </div>
          <p class="mt-4 max-w-3xl text-base sm:text-lg">
            {{ $t('home.cta.description') }}
          </p>
          <div class="mt-8 grid gap-4 md:grid-cols-3">
            <article v-for="item in ctaChapters" :key="item.titleKey" class="chapter-card">
              <p class="chapter-label">{{ $t(item.labelKey) }}</p>
              <h3 class="mt-2 text-lg font-semibold">{{ $t(item.titleKey) }}</h3>
              <p class="mt-2 text-sm">{{ $t(item.bodyKey) }}</p>
            </article>
          </div>
          <p class="mt-6 text-sm leading-6">
            {{ $t('home.cta.disclaimer') }}
          </p>
          <NuxtLink to="/auth/register" class="mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-3 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-400 cursor-pointer">
            {{ $t('home.cta.register') }}
            <Icon name="heroicons:arrow-up-right-20-solid" class="h-5 w-5" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <footer class="border-t border-slate-200/70 bg-slate-50 px-4 py-10 dark:border-slate-700 dark:bg-slate-950 sm:px-6">
      <div class="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <p class="font-semibold text-slate-900 dark:text-slate-100">{{ $t('common.appName') }}</p>
        <div class="flex items-center gap-6">
          <NuxtLink to="/" class="transition-colors duration-200 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer">
            {{ $t('nav.home') }}
          </NuxtLink>
          <NuxtLink to="/about" class="transition-colors duration-200 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer">
            {{ $t('nav.about') }}
          </NuxtLink>
          <p>&copy; {{ currentYear }} {{ $t('about.footer.rights') }}</p>
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
const canonicalUrl = `${siteUrl}/about`

useHead(() => {
  const title = `${t('about.hero.title')} - ${t('common.appName')}`
  const description = t('about.hero.subtitle')

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

// Structured data
const { injectOrganizationSchema, injectBreadcrumbSchema } = useStructuredData()
injectOrganizationSchema()
injectBreadcrumbSchema([
  { name: t('nav.home'), url: '/' },
  { name: t('about.hero.title') },
])

const currentYear = new Date().getFullYear()

const heroNotes = [
  { titleKey: 'about.intro.title', bodyKey: 'about.intro.content' },
  { titleKey: 'about.motivation.title', bodyKey: 'about.motivation.paragraph1' },
  { titleKey: 'about.personal.title', bodyKey: 'about.personal.content' }
]

const coreFeatures = [
  { key: 'diary' },
  { key: 'calendar' },
  { key: 'timeline' }
]

const supportFeatures = [
  { key: 'stocks', icon: 'heroicons:chart-bar-square-20-solid' },
  { key: 'alerts', icon: 'heroicons:bell-alert-20-solid' },
  { key: 'discipline', icon: 'heroicons:flag-20-solid' },
  { key: 'security', icon: 'heroicons:lock-closed-20-solid' }
]

const techStack = ['Nuxt 3', 'Vue 3', 'TypeScript', 'MySQL', 'Tailwind CSS', 'JWT', 'Prisma', 'Vitest']

const promisePills = ['basics', 'risk', 'community', 'longTerm', 'noGuarantee']

const ctaChapters = [
  { labelKey: 'home.cta.step1.label', titleKey: 'home.cta.step1.title', bodyKey: 'home.cta.step1.description' },
  { labelKey: 'home.cta.step2.label', titleKey: 'home.cta.step2.title', bodyKey: 'home.cta.step2.description' },
  { labelKey: 'home.cta.step3.label', titleKey: 'home.cta.step3.title', bodyKey: 'home.cta.step3.description' }
]
</script>

<style scoped>
.about-page {
  font-family: var(--font-body);
  background:
    radial-gradient(1200px 700px at 12% -10%, color-mix(in srgb, var(--color-secondary) 12%, transparent), transparent 58%),
    radial-gradient(1100px 620px at 95% -5%, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent 62%),
    var(--color-background);
}

:global(.dark .about-page),
:global(.dark-mode .about-page) {
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

.about-page :is(h1, h2, h3) {
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
  background: var(--color-primary);
  box-shadow: 0 16px 28px color-mix(in srgb, var(--color-primary) 26%, transparent);
}

.action-btn-primary:hover {
  transform: translateY(-2px);
  background: var(--color-primary-active);
  box-shadow: 0 22px 36px color-mix(in srgb, var(--color-primary) 34%, transparent);
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

.profile-panel {
  border: 1px solid color-mix(in srgb, var(--color-border) 36%, transparent);
  border-radius: 1.35rem;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-secondary) 16%, transparent), transparent 28%),
    var(--color-surface);
  box-shadow: var(--shadow-md);
  color: var(--color-text);
}

:global(.dark .profile-panel),
:global(.dark-mode .profile-panel) {
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-secondary) 18%, transparent), transparent 30%),
    linear-gradient(145deg, #132739, #1e3445 58%, #213847);
  color: var(--color-text);
}

.profile-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 45%, transparent);
}

.profile-status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-secondary) 30%, transparent);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-secondary);
  background: color-mix(in srgb, var(--color-secondary) 10%, transparent);
}

.profile-entry + .profile-entry {
  border-top: 1px solid color-mix(in srgb, var(--color-border) 55%, transparent);
  margin-top: 1rem;
  padding-top: 1rem;
}

.profile-entry-label {
  font-family: var(--font-data);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.profile-entry-text {
  margin-top: 0.45rem;
  line-height: 1.7;
  color: var(--color-text-muted);
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
    var(--color-surface);
  box-shadow: var(--shadow-lg);
  color: var(--color-text);
}

:global(.dark .story-panel),
:global(.dark-mode .story-panel) {
  background:
    radial-gradient(900px 200px at 0% 0%, color-mix(in srgb, var(--color-secondary) 18%, transparent), transparent 60%),
    linear-gradient(145deg, #111720, #17212a);
  color: var(--color-text);
}

.story-link {
  color: var(--color-primary);
}

.story-link:hover {
  color: var(--color-primary-active);
}

:global(.dark .story-link),
:global(.dark-mode .story-link) {
  color: color-mix(in srgb, var(--color-text) 82%, var(--color-secondary));
}

:global(.dark .story-link:hover),
:global(.dark-mode .story-link:hover) {
  color: #fff;
}

.chapter-card {
  border: 1px solid color-mix(in srgb, var(--color-background) 12%, transparent);
  border-radius: var(--radius-md);
  padding: 1rem;
  background: color-mix(in srgb, var(--color-background) 5%, transparent);
}

:global(.dark .chapter-card),
:global(.dark-mode .chapter-card) {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
}

:global(.dark .story-panel h2),
:global(.dark .story-panel .chapter-card h3),
:global(.dark-mode .story-panel h2),
:global(.dark-mode .story-panel .chapter-card h3) {
  color: var(--color-text);
}

.chapter-label {
  color: color-mix(in srgb, var(--color-primary) 72%, var(--color-secondary));
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

:global(.dark .chapter-label),
:global(.dark-mode .chapter-label) {
  color: color-mix(in srgb, var(--color-background) 72%, var(--color-secondary));
}

.reveal { animation: reveal-up 700ms ease both; }
.reveal-2 { animation-delay: 120ms; }

@keyframes reveal-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (min-width: 768px) {
  .story-panel { padding: 2rem; }
  .workflow-sequence { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 1024px) {
  .split-grid { grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr); }
  .workflow-grid { grid-template-columns: minmax(0, 1.18fr) minmax(280px, 0.82fr); }
}
</style>
