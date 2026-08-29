<template>
  <div class="fintech-home min-h-screen text-dt-text">
    <!-- Hero Section -->
    <section class="relative px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div class="mx-auto max-w-7xl">
        <div class="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <!-- Left: copy + CTAs -->
          <div class="reveal">
            <span class="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.18em] text-dt-text-muted">
              {{ $t('home.hero.eyebrow') }}
            </span>
            <h1 class="text-4xl font-semibold leading-tight text-dt-text sm:text-5xl lg:text-6xl">
              {{ $t('home.hero.title') }}
            </h1>
            <p class="mt-6 max-w-2xl text-base leading-relaxed text-dt-text sm:text-lg">
              {{ $t('home.hero.description') }}
            </p>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <NuxtLink to="/auth/register" class="cursor-pointer">
                <BaseButton variant="primary">
                  {{ $t('home.hero.primaryCta') }}
                  <Icon name="heroicons:pencil-square-20-solid" class="ml-2 h-4 w-4" />
                </BaseButton>
              </NuxtLink>
              <NuxtLink to="/how-to-use" class="cursor-pointer">
                <BaseButton variant="secondary">
                  {{ $t('home.hero.secondaryCta') }}
                </BaseButton>
              </NuxtLink>
            </div>
          </div>

          <!-- Right: diary note preview card -->
          <div class="reveal reveal-2">
            <DiaryNotePreview />
          </div>
        </div>
      </div>
    </section>

    <!-- Trust Section -->
    <section class="px-4 pb-20 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="trust-strip reveal">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-dt-text-soft">{{ $t('home.promise.title') }}</p>
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
            :icon-color="key === 'basics' ? 'text-dt-info' : key === 'risk' ? 'text-dt-warning' : 'text-dt-success'"
            :reveal="true"
            :reveal-delay="idx + 1"
          />
        </div>

        <div class="subpanel reveal reveal-2">
          <div class="mb-8">
            <p class="subpanel-kicker">{{ $t('home.community.title') }}</p>
            <h3 class="mt-3 text-2xl font-semibold tracking-tight text-dt-text">
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
              :icon-color="key === 'share' ? 'text-dt-info' : key === 'feedback' ? 'text-dt-primary' : 'text-dt-danger'"
            />
          </div>
        </div>
      </div>

      <div class="mt-12 reveal">
        <p class="subpanel-kicker">{{ $t('home.turnaround.title') }}</p>
        <h3 class="mt-2 text-2xl font-semibold tracking-tight text-dt-text sm:text-3xl">
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
          <h3 class="mt-3 text-3xl font-semibold tracking-tight text-dt-text">
            {{ $t('home.features.diary.description') }}
          </h3>
          <p class="mt-4 max-w-3xl text-base leading-7 text-dt-text-muted">
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
            <h2 class="text-2xl font-semibold sm:text-3xl">{{ $t('home.cta.title') }}</h2>
            <NuxtLink to="/auth/login" class="inline-flex items-center gap-2 text-sm font-semibold text-dt-secondary transition-colors duration-200 hover:text-dt-secondary-active cursor-pointer">
              {{ $t('home.cta.login') }}
              <Icon name="heroicons:arrow-right-20-solid" class="h-4 w-4" />
            </NuxtLink>
          </div>
          <p class="mt-4 max-w-3xl text-base sm:text-lg">
            {{ $t('home.cta.description') }}
          </p>
          <div class="mt-8 grid gap-4 md:grid-cols-3">
            <article v-for="n in 3" :key="n" class="chapter-card">
              <p class="chapter-label">{{ $t(`home.cta.step${n}.label`) }}</p>
              <h3 class="mt-2 text-lg font-semibold">{{ $t(`home.cta.step${n}.title`) }}</h3>
              <p class="mt-2 text-sm">{{ $t(`home.cta.step${n}.description`) }}</p>
            </article>
          </div>
          <p class="mt-6 text-sm leading-6">
            {{ $t('home.cta.disclaimer') }}
          </p>
          <NuxtLink to="/auth/register" class="mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] dark:bg-[var(--color-primary)] px-7 py-3 text-base font-semibold text-white dark:text-white shadow-lg shadow-[var(--color-primary)]/30 dark:shadow-[var(--color-primary)]/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-primary-active)] dark:hover:bg-[var(--color-primary-active)] cursor-pointer">
            {{ $t('home.cta.register') }}
            <Icon name="heroicons:arrow-up-right-20-solid" class="h-5 w-5" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <footer class="border-t border-dt-border bg-dt-surface-strong px-4 py-10 sm:px-6">
      <div class="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-dt-text-muted sm:flex-row sm:items-center sm:justify-between">
        <p class="font-semibold text-dt-text">{{ $t('common.appName') }}</p>
        <div class="flex items-center gap-6">
          <NuxtLink to="/about" class="transition-colors duration-200 hover:text-dt-text cursor-pointer">
            {{ $t('nav.about') }}
          </NuxtLink>
          <p>&copy; {{ currentYear }} {{ $t('home.footer.rights') }}</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  requiresAuth: false,
  middleware: 'auth',
})

const { t } = useI18n()
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl || 'https://trade-basic.com').replace(/\/+$/, '')
const canonicalUrl = `${siteUrl}/`

useHead(() => {
  const title = `${t('home.hero.title')} - ${t('common.appName')}`
  const description = t('home.hero.description')

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
  { key: 'partnerCompare', icon: 'heroicons:user-group-20-solid' },
  { key: 'security', icon: 'heroicons:lock-closed-20-solid' },
  { key: 'themes', icon: 'heroicons:moon-20-solid' }
]

const promisePills = ['basics', 'risk', 'community', 'longTerm', 'noGuarantee']
</script>

<style scoped>
.fintech-home {
  font-family: var(--font-body);
  background: var(--color-background);
}

/* ponytail: Phase 8 — removed decorative radial gradients + grid-dot.
   Surfaces stay solid per Calm Institutional Ledger direction. */

.editorial-panel-wrapper :deep(.section-panel) {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.fintech-home :is(h1, h2, h3) {
  font-family: var(--font-display);
  letter-spacing: -0.025em;
}

.trust-strip {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
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
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text);
}

.subpanel {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  background: var(--color-surface);
}

.subpanel-kicker {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-info);
}

.split-grid { display: grid; gap: 1.5rem; }
.sequence-grid { display: grid; gap: 1rem; }
.workflow-grid { display: grid; gap: 1.25rem; }

.workflow-lead,
.workflow-tool,
.workflow-footnote {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
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
  color: var(--color-info);
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
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
}

.workflow-tool-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-info);
}

.workflow-footnote {
  margin-top: 1.25rem;
  padding: 1.25rem;
}

.story-panel {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.6rem;
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
  color: var(--color-text);
}

:global(.dark .story-panel),
:global(.dark-mode .story-panel) {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

.chapter-card {
  border: 1px solid color-mix(in srgb, var(--color-background) 12%, transparent);
  border-radius: var(--radius-md);
  padding: 1rem;
  background: color-mix(in srgb, var(--color-background) 5%, transparent);
}

:global(.dark .chapter-card),
:global(.dark-mode .chapter-card) {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
}

:global(.dark .story-panel h2),
:global(.dark-mode .story-panel h2) {
  color: var(--color-text);
}

:global(.dark .story-panel .chapter-card h3),
:global(.dark-mode .story-panel .chapter-card h3) {
  color: var(--color-text);
}

.chapter-label {
  color: var(--color-info);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

:global(.dark .chapter-label),
:global(.dark-mode .chapter-label) {
  color: var(--color-info);
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
