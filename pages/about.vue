<template>
  <main class="about-page min-h-screen text-slate-900 dark:text-slate-100">
    <section class="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div class="bg-grid absolute inset-0 opacity-30" aria-hidden="true" />
      <div class="orb orb-cyan" aria-hidden="true" />
      <div class="orb orb-orange" aria-hidden="true" />
      <div class="relative mx-auto max-w-7xl">
        <div class="hero-card">
          <p class="inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 backdrop-blur dark:border-sky-700/60 dark:bg-slate-900/80 dark:text-sky-200">
            <Icon name="heroicons:user-circle-20-solid" class="h-4 w-4 text-sky-600 dark:text-sky-300" />
            Builder Notes
          </p>
          <h1 class="mt-5 text-4xl font-semibold leading-tight text-slate-950 dark:text-slate-100 sm:text-5xl lg:text-6xl">
            {{ $t('about.hero.title') }}
          </h1>
          <p class="mt-5 max-w-3xl text-base leading-relaxed text-slate-700 dark:text-slate-300 sm:text-lg">
            {{ $t('about.hero.subtitle') }}
          </p>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6">
      <div class="section-panel mx-auto max-w-7xl">
        <div class="mb-8">
          <h2 class="section-title text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            {{ $t('about.intro.title') }}
          </h2>
        </div>
        <div class="prose-panel">
          <p class="text-lg leading-relaxed text-slate-700 dark:text-slate-300">
            {{ $t('about.intro.content') }}
          </p>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6">
      <div class="section-panel mx-auto max-w-7xl">
        <div class="mb-8">
          <h2 class="section-title text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            {{ $t('about.motivation.title') }}
          </h2>
        </div>
        <div class="grid gap-5 md:grid-cols-2">
          <article class="story-card">
            <Icon name="heroicons:light-bulb-20-solid" class="mb-3 h-6 w-6 text-amber-500" />
            <p class="leading-relaxed text-slate-700 dark:text-slate-300">
              {{ $t('about.motivation.paragraph1') }}
            </p>
          </article>
          <article class="story-card">
            <Icon name="heroicons:wrench-screwdriver-20-solid" class="mb-3 h-6 w-6 text-sky-500" />
            <p class="leading-relaxed text-slate-700 dark:text-slate-300">
              {{ $t('about.motivation.paragraph2') }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6">
      <div class="section-panel mx-auto max-w-7xl">
        <div class="mb-10">
          <h2 class="section-title text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            {{ $t('about.features.title') }}
          </h2>
          <p class="section-subtitle mt-3 max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ $t('about.features.subtitle') }}
          </p>
        </div>

        <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <article class="feature-card">
            <Icon name="heroicons:pencil-20-solid" class="feature-icon text-sky-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('about.features.diary.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('about.features.diary.description') }}</p>
          </article>
          <article class="feature-card">
            <Icon name="heroicons:calendar-days-20-solid" class="feature-icon text-blue-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('about.features.calendar.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('about.features.calendar.description') }}</p>
          </article>
          <article class="feature-card">
            <Icon name="heroicons:clock-20-solid" class="feature-icon text-indigo-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('about.features.timeline.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('about.features.timeline.description') }}</p>
          </article>
          <article class="feature-card">
            <Icon name="heroicons:chart-bar-square-20-solid" class="feature-icon text-emerald-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('about.features.stocks.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('about.features.stocks.description') }}</p>
          </article>
          <article class="feature-card">
            <Icon name="heroicons:bell-alert-20-solid" class="feature-icon text-orange-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('about.features.alerts.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('about.features.alerts.description') }}</p>
          </article>
          <article class="feature-card">
            <Icon name="heroicons:flag-20-solid" class="feature-icon text-rose-700" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('about.features.discipline.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('about.features.discipline.description') }}</p>
          </article>
          <article class="feature-card md:col-span-2 xl:col-span-3">
            <Icon name="heroicons:lock-closed-20-solid" class="feature-icon text-slate-700 dark:text-slate-300" />
            <h3 class="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{{ $t('about.features.security.title') }}</h3>
            <p class="mt-2 text-slate-600 dark:text-slate-300">{{ $t('about.features.security.description') }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="px-4 pb-20 sm:px-6">
      <div class="section-panel mx-auto max-w-7xl">
        <div class="mb-10">
          <h2 class="section-title text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            {{ $t('about.tech.title') }}
          </h2>
          <p class="section-subtitle mt-3 max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
            {{ $t('about.tech.subtitle') }}
          </p>
        </div>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          <div class="tech-card"><span>Nuxt 3</span></div>
          <div class="tech-card"><span>Vue 3</span></div>
          <div class="tech-card"><span>TypeScript</span></div>
          <div class="tech-card"><span>MySQL</span></div>
          <div class="tech-card"><span>Tailwind CSS</span></div>
          <div class="tech-card"><span>JWT</span></div>
          <div class="tech-card"><span>Prisma</span></div>
          <div class="tech-card"><span>Vitest</span></div>
        </div>
      </div>
    </section>

    <section class="px-4 pb-24 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="story-panel">
          <h2 class="text-2xl font-semibold text-slate-50 sm:text-3xl">
            {{ $t('about.personal.title') }}
          </h2>
          <p class="mt-4 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {{ $t('about.personal.content') }}
          </p>
        </div>
      </div>
    </section>

    <footer class="border-t border-slate-200/70 bg-slate-50 px-4 py-10 dark:border-slate-700 dark:bg-slate-950 sm:px-6">
      <div class="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <p class="font-semibold text-slate-900 dark:text-slate-100">{{ $t('common.appName') }}</p>
        <div class="flex items-center gap-6">
          <NuxtLink to="/" class="transition-colors duration-200 hover:text-slate-900 dark:hover:text-slate-100">
            {{ $t('nav.home') }}
          </NuxtLink>
          <NuxtLink to="/about" class="transition-colors duration-200 hover:text-slate-900 dark:hover:text-slate-100">
            {{ $t('nav.about') }}
          </NuxtLink>
          <p>&copy; {{ new Date().getFullYear() }} {{ $t('about.footer.rights') }}</p>
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

useHead({
  title: () => `${t('about.hero.title')} - ${t('common.appName')}`
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

.about-page {
  font-family: 'IBM Plex Sans', 'Avenir Next', 'Segoe UI', sans-serif;
  background:
    radial-gradient(1200px 700px at 12% -10%, rgb(56 189 248 / 18%), transparent 58%),
    radial-gradient(1100px 620px at 95% -5%, rgb(249 115 22 / 12%), transparent 62%),
    rgb(240 249 255);
}

:global(.dark .about-page),
:global(.dark-mode .about-page) {
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

.hero-card {
  border: 1px solid rgb(186 230 253 / 80%);
  border-radius: 1.2rem;
  background: rgb(255 255 255 / 78%);
  backdrop-filter: blur(8px);
  padding: 2rem;
  box-shadow: 0 18px 36px rgb(14 165 233 / 10%);
}

:global(.dark .hero-card),
:global(.dark-mode .hero-card) {
  border-color: rgb(71 85 105);
  background: rgb(10 16 30 / 82%);
}

.section-panel {
  border: 1px solid rgb(186 230 253 / 70%);
  border-radius: 1.25rem;
  padding: 1.5rem;
  background: linear-gradient(180deg, rgb(255 255 255 / 72%), rgb(255 255 255 / 56%));
  box-shadow: 0 16px 35px rgb(15 23 42 / 8%);
}

:global(.dark .section-panel),
:global(.dark-mode .section-panel) {
  border-color: rgb(51 65 85 / 88%);
  background: linear-gradient(180deg, rgb(10 16 30 / 86%), rgb(10 16 30 / 76%));
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

.prose-panel {
  border: 1px solid rgb(186 230 253 / 82%);
  border-radius: 1rem;
  background: rgb(255 255 255 / 84%);
  padding: 1.25rem;
}

:global(.dark .prose-panel),
:global(.dark-mode .prose-panel) {
  border-color: rgb(71 85 105);
  background: rgb(10 16 30 / 88%);
}

.story-card {
  border: 1px solid rgb(186 230 253 / 82%);
  border-radius: 1rem;
  background: rgb(255 255 255 / 84%);
  padding: 1.25rem;
}

:global(.dark .story-card),
:global(.dark-mode .story-card) {
  border-color: rgb(71 85 105);
  background: rgb(10 16 30 / 88%);
}

.feature-card {
  border: 1px solid rgb(186 230 253 / 82%);
  border-radius: 1rem;
  background: rgb(255 255 255 / 84%);
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

.feature-card:hover {
  transform: translateY(-3px);
  border-color: rgb(14 165 233 / 45%);
  box-shadow: 0 16px 34px rgb(14 165 233 / 18%);
}

:global(.dark .feature-card),
:global(.dark-mode .feature-card) {
  border-color: rgb(71 85 105);
  background: rgb(10 16 30 / 88%);
}

.feature-icon {
  width: 2rem;
  height: 2rem;
}

.tech-card {
  border: 1px solid rgb(186 230 253 / 82%);
  border-radius: 0.95rem;
  background: rgb(255 255 255 / 84%);
  min-height: 76px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: rgb(15 23 42);
}

:global(.dark .tech-card),
:global(.dark-mode .tech-card) {
  border-color: rgb(71 85 105);
  background: rgb(10 16 30 / 88%);
  color: rgb(226 232 240);
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

@media (min-width: 768px) {
  .hero-card,
  .section-panel,
  .story-panel {
    padding: 2rem;
  }
}
</style>
