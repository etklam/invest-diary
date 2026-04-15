<template>
  <main class="about-page min-h-screen text-slate-900 dark:text-slate-100">
    <!-- Hero Section -->
    <section class="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div class="bg-grid absolute inset-0 opacity-30" aria-hidden="true" />
      <LandingOrb color="cyan" size="lg" position="top-10 right-[12%]" />
      <LandingOrb color="orange" size="md" position="bottom-8 left-[10%]" />
      
      <div class="relative mx-auto max-w-7xl">
        <div class="hero-card">
          <LandingBadge icon="heroicons:user-circle-20-solid">
            Builder Notes
          </LandingBadge>
          <h1 class="mt-5 text-4xl font-semibold leading-tight text-slate-950 dark:text-slate-100 sm:text-5xl lg:text-6xl">
            {{ $t('about.hero.title') }}
          </h1>
          <p class="mt-5 max-w-3xl text-base leading-relaxed text-slate-700 dark:text-slate-300 sm:text-lg">
            {{ $t('about.hero.subtitle') }}
          </p>
        </div>
      </div>
    </section>

    <!-- Intro Section -->
    <LandingSection :title="$t('about.intro.title')">
      <div class="prose-panel">
        <p class="text-lg leading-relaxed text-slate-700 dark:text-slate-300">
          {{ $t('about.intro.content') }}
        </p>
      </div>
    </LandingSection>

    <!-- Motivation Section -->
    <LandingSection :title="$t('about.motivation.title')">
      <div class="grid gap-5 md:grid-cols-2">
        <LandingCard
          variant="quiet"
          icon="heroicons:light-bulb-20-solid"
          icon-color="text-amber-500"
          :description="$t('about.motivation.paragraph1')"
        />
        <LandingCard
          variant="quiet"
          icon="heroicons:wrench-screwdriver-20-solid"
          icon-color="text-sky-500"
          :description="$t('about.motivation.paragraph2')"
        />
      </div>
    </LandingSection>

    <!-- Features Section -->
    <LandingSection
      :title="$t('about.features.title')"
      :subtitle="$t('about.features.subtitle')"
    >
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <LandingCard
          v-for="feat in [
            { key: 'diary', icon: 'heroicons:pencil-20-solid', color: 'text-sky-700 dark:text-sky-400' },
            { key: 'calendar', icon: 'heroicons:calendar-days-20-solid', color: 'text-blue-700 dark:text-blue-400' },
            { key: 'timeline', icon: 'heroicons:clock-20-solid', color: 'text-indigo-700 dark:text-indigo-400' },
            { key: 'stocks', icon: 'heroicons:chart-bar-square-20-solid', color: 'text-emerald-700 dark:text-emerald-400' },
            { key: 'alerts', icon: 'heroicons:bell-alert-20-solid', color: 'text-orange-700 dark:text-orange-400' },
            { key: 'discipline', icon: 'heroicons:flag-20-solid', color: 'text-rose-700 dark:text-rose-400' }
          ]"
          :key="feat.key"
          :title="$t(`about.features.${feat.key}.title`)"
          :description="$t(`about.features.${feat.key}.description`)"
          :icon="feat.icon"
          :icon-color="feat.color"
        />
        <LandingCard
          class="md:col-span-2 xl:col-span-3"
          :title="$t('about.features.security.title')"
          :description="$t('about.features.security.description')"
          icon="heroicons:lock-closed-20-solid"
          icon-color="text-slate-700 dark:text-slate-300"
        />
      </div>
    </LandingSection>

    <!-- Tech Section -->
    <LandingSection
      :title="$t('about.tech.title')"
      :subtitle="$t('about.tech.subtitle')"
    >
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        <div v-for="tech in ['Nuxt 3', 'Vue 3', 'TypeScript', 'MySQL', 'Tailwind CSS', 'JWT', 'Prisma', 'Vitest']" :key="tech" class="tech-card">
          <span>{{ tech }}</span>
        </div>
      </div>
    </LandingSection>

    <!-- Personal Section -->
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
  .story-panel {
    padding: 2rem;
  }
}
</style>
