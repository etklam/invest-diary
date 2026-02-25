<template>
  <main class="fintech-home min-h-screen text-slate-900">
    <section class="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div class="bg-grid absolute inset-0 opacity-35" aria-hidden="true" />
      <div class="orb orb-cyan" aria-hidden="true" />
      <div class="orb orb-orange" aria-hidden="true" />

      <div class="relative mx-auto max-w-7xl">
        <div class="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div class="reveal">
            <p class="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 backdrop-blur">
              <Icon name="heroicons:shield-check-20-solid" class="h-4 w-4 text-sky-600" />
              Fintech Journal OS
            </p>
            <h1 class="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {{ $t('home.hero.title') }}
            </h1>
            <p class="mt-6 max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg">
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
                <dt class="text-xs uppercase tracking-[0.2em] text-slate-500">Success Rate</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900">94.8%</dd>
              </div>
              <div class="metric-card reveal reveal-3">
                <dt class="text-xs uppercase tracking-[0.2em] text-slate-500">Latency</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900">52 ms</dd>
              </div>
              <div class="metric-card reveal reveal-4">
                <dt class="text-xs uppercase tracking-[0.2em] text-slate-500">Audit Events</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900">1.2M+</dd>
              </div>
            </dl>
          </div>

          <div class="reveal reveal-2">
            <div class="terminal-panel">
              <header class="terminal-head">
                <span class="font-medium text-slate-200">Live Position Briefing</span>
                <span class="rounded-full border border-emerald-400/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">
                  Synced
                </span>
              </header>
              <div class="space-y-3 p-5">
                <div class="row-item">
                  <span class="text-slate-300">Portfolio Risk</span>
                  <span class="font-semibold text-emerald-300">Low / Guarded</span>
                </div>
                <div class="row-item">
                  <span class="text-slate-300">Concentration</span>
                  <span class="font-semibold text-amber-300">Moderate</span>
                </div>
                <div class="row-item">
                  <span class="text-slate-300">Signal Strength</span>
                  <span class="font-semibold text-sky-300">+18.7%</span>
                </div>
                <div class="h-px bg-slate-700/60" />
                <p class="text-sm leading-6 text-slate-400">
                  Chronicle every thesis, position, and reminder in one secure timeline designed for disciplined investing.
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
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Trusted Workflow Signals</p>
          <div class="mt-4 flex flex-wrap gap-3">
            <span class="trust-pill">Bank-grade auth</span>
            <span class="trust-pill">Private timeline</span>
            <span class="trust-pill">Event reminders</span>
            <span class="trust-pill">Position analytics</span>
            <span class="trust-pill">Audit-friendly records</span>
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="mb-10 reveal">
          <h2 class="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {{ $t('home.features.title') }}
          </h2>
          <p class="mt-3 max-w-3xl text-base text-slate-600 sm:text-lg">
            {{ $t('home.features.subtitle') }}
          </p>
        </div>

        <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <article class="feature-card reveal">
            <Icon name="heroicons:book-open-20-solid" class="feature-icon text-sky-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950">{{ $t('home.features.diary.title') }}</h3>
            <p class="mt-2 text-slate-600">{{ $t('home.features.diary.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-2">
            <Icon name="heroicons:chart-bar-square-20-solid" class="feature-icon text-emerald-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950">{{ $t('home.features.stocks.title') }}</h3>
            <p class="mt-2 text-slate-600">{{ $t('home.features.stocks.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-3">
            <Icon name="heroicons:bell-alert-20-solid" class="feature-icon text-orange-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950">{{ $t('home.features.alerts.title') }}</h3>
            <p class="mt-2 text-slate-600">{{ $t('home.features.alerts.description') }}</p>
          </article>
          <article class="feature-card reveal">
            <Icon name="heroicons:clock-20-solid" class="feature-icon text-indigo-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950">{{ $t('home.features.timeline.title') }}</h3>
            <p class="mt-2 text-slate-600">{{ $t('home.features.timeline.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-2">
            <Icon name="heroicons:lock-closed-20-solid" class="feature-icon text-rose-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950">{{ $t('home.features.security.title') }}</h3>
            <p class="mt-2 text-slate-600">{{ $t('home.features.security.description') }}</p>
          </article>
          <article class="feature-card reveal reveal-3">
            <Icon name="heroicons:moon-20-solid" class="feature-icon text-cyan-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950">{{ $t('home.features.themes.title') }}</h3>
            <p class="mt-2 text-slate-600">{{ $t('home.features.themes.description') }}</p>
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
              <p class="chapter-label">Chapter 01</p>
              <h3 class="mt-2 text-lg font-semibold text-white">Capture</h3>
              <p class="mt-2 text-sm text-slate-300">Log each decision with context and market assumptions.</p>
            </article>
            <article class="chapter-card">
              <p class="chapter-label">Chapter 02</p>
              <h3 class="mt-2 text-lg font-semibold text-white">Evaluate</h3>
              <p class="mt-2 text-sm text-slate-300">Compare results with your thesis and identify weak signals.</p>
            </article>
            <article class="chapter-card">
              <p class="chapter-label">Chapter 03</p>
              <h3 class="mt-2 text-lg font-semibold text-white">Compound</h3>
              <p class="mt-2 text-sm text-slate-300">Build discipline from feedback loops and consistent review.</p>
            </article>
          </div>
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

    <footer class="border-t border-slate-200/70 bg-slate-50 px-4 py-10 sm:px-6">
      <div class="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p class="font-semibold text-slate-900">{{ $t('common.appName') }}</p>
        <div class="flex items-center gap-6">
          <NuxtLink to="/about" class="transition-colors duration-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 cursor-pointer">
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

.metric-card {
  border: 1px solid rgb(186 230 253 / 95%);
  border-radius: 0.95rem;
  background: rgb(255 255 255 / 82%);
  backdrop-filter: blur(8px);
  padding: 1rem;
}

.terminal-panel {
  border: 1px solid rgb(30 41 59 / 32%);
  border-radius: 1.1rem;
  overflow: hidden;
  background:
    linear-gradient(145deg, rgb(15 23 42 / 98%), rgb(30 41 59 / 94%));
  box-shadow: 0 20px 45px rgb(15 23 42 / 26%);
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
  background: rgb(255 255 255 / 76%);
  backdrop-filter: blur(8px);
  padding: 1.2rem;
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

.feature-card {
  border: 1px solid rgb(186 230 253 / 82%);
  border-radius: 1rem;
  background: rgb(255 255 255 / 84%);
  backdrop-filter: blur(8px);
  padding: 1.35rem;
  transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
}

.feature-card:hover {
  transform: translateY(-3px);
  border-color: rgb(14 165 233 / 45%);
  box-shadow: 0 14px 30px rgb(14 165 233 / 14%);
}

.feature-icon {
  width: 2rem;
  height: 2rem;
}

.story-panel {
  border: 1px solid rgb(30 41 59 / 70%);
  border-radius: 1.25rem;
  padding: 1.5rem;
  background:
    radial-gradient(900px 200px at 0% 0%, rgb(56 189 248 / 18%), transparent 60%),
    linear-gradient(145deg, rgb(2 6 23), rgb(15 23 42));
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
</style>
