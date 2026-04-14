<template>
  <div class="max-w-content mx-auto px-6 py-24 md:py-32">
    <div class="max-w-[640px]">
      <div class="mb-8 inline-flex items-center gap-2 text-accent font-semibold text-sm uppercase tracking-widest">
        <div class="w-2 h-2 bg-accent"></div>
        {{ $t('home.badge') }}
      </div>
      
      <h1 class="text-4xl md:text-6xl font-semibold tracking-tight text-copy mb-6 leading-[1.1]">
        {{ $t('home.hero.title') }}
      </h1>
      
      <p class="text-lg md:text-xl text-copy-secondary mb-12 leading-relaxed">
        {{ $t('home.hero.subtitle') }}
      </p>

      <div class="flex flex-col sm:flex-row gap-4 mb-24">
        <BaseButton variant="primary" size="lg" @click="navigateTo('/auth/register')">
          {{ $t('home.hero.getStarted') }}
          <Icon name="lucide:arrow-right" class="ml-2 h-5 w-5" />
        </BaseButton>
        <BaseButton variant="secondary" size="lg" @click="navigateTo('/how-to-use')">
          {{ $t('home.hero.learnMore') }}
        </BaseButton>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-line pt-12">
        <div v-for="n in 3" :key="n" class="space-y-3">
          <dt class="text-xs font-semibold uppercase tracking-widest text-copy-muted">
            {{ $t(`home.progress.${n === 1 ? 'journalLabel' : n === 2 ? 'reviewLabel' : 'rulesLabel'}`) }}
          </dt>
          <dd class="text-2xl font-semibold text-copy">
            {{ $t(`home.progress.${n === 1 ? 'journalValue' : n === 2 ? 'reviewValue' : 'rulesValue'}`) }}
          </dd>
        </div>
      </div>
    </div>

    <!-- Simple Feature Grid -->
    <section class="mt-32 grid grid-cols-1 md:grid-cols-2 gap-16">
      <div v-for="feat in landingFeatures" :key="feat.key" class="space-y-4">
        <div class="w-12 h-12 bg-surface-alt border border-line flex items-center justify-center">
          <Icon :name="feat.icon" class="h-6 w-6 text-accent" />
        </div>
        <h3 class="text-xl font-semibold text-copy">{{ $t(`home.features.${feat.key}.title`) }}</h3>
        <p class="text-copy-secondary leading-relaxed">
          {{ $t(`home.features.${feat.key}.description`) }}
        </p>
      </div>
    </section>

    <!-- Simple Footer -->
    <footer class="mt-32 pt-12 border-t border-line flex flex-col md:flex-row justify-between items-center gap-8">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 bg-copy"></div>
        <span class="font-bold text-copy">{{ $t('common.appName') }}</span>
      </div>
      <div class="flex gap-8 text-sm text-copy-muted">
        <NuxtLink to="/about" class="hover:text-copy transition-colors">{{ $t('nav.about') }}</NuxtLink>
        <span>&copy; {{ currentYear }} {{ $t('home.footer.rights') }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  requiresAuth: false
})

const currentYear = new Date().getFullYear()

const landingFeatures = [
  { key: 'diary', icon: 'lucide:book-open' },
  { key: 'stocks', icon: 'lucide:line-chart' },
  { key: 'alerts', icon: 'lucide:bell' },
  { key: 'timeline', icon: 'lucide:history' }
]
</script>
