<template>
  <div class="min-h-screen bg-white dark:bg-gray-900">
    <!-- Hero Section -->
    <section class="relative bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-900 dark:to-purple-900 text-white py-20 sm:py-28">
      <div class="container mx-auto px-4">
        <div class="max-w-3xl mx-auto text-center">
          <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
            {{ $t('about.hero.title') }}
          </h1>
          <p class="text-lg sm:text-xl text-indigo-100 dark:text-indigo-200">
            {{ $t('about.hero.subtitle') }}
          </p>
        </div>
      </div>
    </section>

    <!-- Introduction Section -->
    <section class="py-16 sm:py-24">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-12">
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {{ $t('about.intro.title') }}
            </h2>
          </div>
          <div class="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-8 sm:p-12 shadow-lg">
            <p class="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {{ $t('about.intro.content') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Motivation Section -->
    <section class="py-16 sm:py-24 bg-gray-50 dark:bg-gray-800">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-12">
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {{ $t('about.motivation.title') }}
            </h2>
          </div>
          <div class="prose prose-lg dark:prose-invert max-w-none">
            <p class="text-gray-700 dark:text-gray-300 mb-4">
              {{ $t('about.motivation.paragraph1') }}
            </p>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t('about.motivation.paragraph2') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-16 sm:py-24">
      <div class="container mx-auto px-4">
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-16">
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {{ $t('about.features.title') }}
            </h2>
            <p class="text-lg text-gray-600 dark:text-gray-400">
              {{ $t('about.features.subtitle') }}
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <!-- Feature 1: Diary -->
            <div class="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-start mb-4">
                <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                  <Icon name="heroicons:pencil" class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ $t('about.features.diary.title') }}
                </h3>
              </div>
              <p class="text-gray-600 dark:text-gray-400">
                {{ $t('about.features.diary.description') }}
              </p>
            </div>

            <!-- Feature 2: Calendar -->
            <div class="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-start mb-4">
                <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                  <Icon name="heroicons:calendar" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ $t('about.features.calendar.title') }}
                </h3>
              </div>
              <p class="text-gray-600 dark:text-gray-400">
                {{ $t('about.features.calendar.description') }}
              </p>
            </div>

            <!-- Feature 3: Timeline -->
            <div class="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-start mb-4">
                <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                  <Icon name="heroicons:clock" class="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ $t('about.features.timeline.title') }}
                </h3>
              </div>
              <p class="text-gray-600 dark:text-gray-400">
                {{ $t('about.features.timeline.description') }}
              </p>
            </div>

            <!-- Feature 4: Stocks -->
            <div class="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-start mb-4">
                <div class="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                  <Icon name="heroicons:chart-bar" class="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ $t('about.features.stocks.title') }}
                </h3>
              </div>
              <p class="text-gray-600 dark:text-gray-400">
                {{ $t('about.features.stocks.description') }}
              </p>
            </div>

            <!-- Feature 5: Alerts -->
            <div class="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-start mb-4">
                <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                  <Icon name="heroicons:bell" class="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ $t('about.features.alerts.title') }}
                </h3>
              </div>
              <p class="text-gray-600 dark:text-gray-400">
                {{ $t('about.features.alerts.description') }}
              </p>
            </div>

            <!-- Feature 6: Discipline -->
            <div class="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-start mb-4">
                <div class="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                  <Icon name="heroicons:flag" class="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ $t('about.features.discipline.title') }}
                </h3>
              </div>
              <p class="text-gray-600 dark:text-gray-400">
                {{ $t('about.features.discipline.description') }}
              </p>
            </div>

            <!-- Feature 7: Security -->
            <div class="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 md:col-span-2 lg:col-span-3">
              <div class="flex items-start mb-4">
                <div class="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                  <Icon name="heroicons:shield-check" class="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ $t('about.features.security.title') }}
                </h3>
              </div>
              <p class="text-gray-600 dark:text-gray-400">
                {{ $t('about.features.security.description') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Tech Stack Section -->
    <section class="py-16 sm:py-24 bg-gray-50 dark:bg-gray-800">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-12">
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {{ $t('about.tech.title') }}
            </h2>
            <p class="text-lg text-gray-600 dark:text-gray-400">
              {{ $t('about.tech.subtitle') }}
            </p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div class="bg-white dark:bg-gray-900 rounded-lg p-6 text-center shadow-md">
              <div class="text-3xl mb-2">⚡️</div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">Nuxt 3</div>
            </div>
            <div class="bg-white dark:bg-gray-900 rounded-lg p-6 text-center shadow-md">
              <div class="text-3xl mb-2">💚</div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">Vue 3</div>
            </div>
            <div class="bg-white dark:bg-gray-900 rounded-lg p-6 text-center shadow-md">
              <div class="text-3xl mb-2">🔷</div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">TypeScript</div>
            </div>
            <div class="bg-white dark:bg-gray-900 rounded-lg p-6 text-center shadow-md">
              <div class="text-3xl mb-2">🗄️</div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">MySQL</div>
            </div>
            <div class="bg-white dark:bg-gray-900 rounded-lg p-6 text-center shadow-md">
              <div class="text-3xl mb-2">🎨</div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">Tailwind CSS</div>
            </div>
            <div class="bg-white dark:bg-gray-900 rounded-lg p-6 text-center shadow-md">
              <div class="text-3xl mb-2">🔐</div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">JWT</div>
            </div>
            <div class="bg-white dark:bg-gray-900 rounded-lg p-6 text-center shadow-md">
              <div class="text-3xl mb-2">📝</div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">Prisma</div>
            </div>
            <div class="bg-white dark:bg-gray-900 rounded-lg p-6 text-center shadow-md">
              <div class="text-3xl mb-2">✅</div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">Vitest</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Personal Project Section -->
    <section class="py-16 sm:py-24">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-12">
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {{ $t('about.personal.title') }}
            </h2>
          </div>
          <div class="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-8 sm:p-12 shadow-lg">
            <p class="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {{ $t('about.personal.content') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-400 py-12">
      <div class="container mx-auto px-4">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <div class="mb-4 md:mb-0">
            <span class="text-xl font-bold text-white">{{ $t('common.appName') }}</span>
          </div>
          <div class="flex gap-6">
            <NuxtLink to="/" class="hover:text-white transition-colors">
              {{ $t('nav.home') }}
            </NuxtLink>
            <NuxtLink to="/about" class="hover:text-white transition-colors">
              {{ $t('nav.about') }}
            </NuxtLink>
          </div>
        </div>
        <div class="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
          &copy; {{ new Date().getFullYear() }} {{ $t('common.appName') }}. {{ $t('about.footer.rights') }}
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// About page is public
definePageMeta({
  requiresAuth: false
})

useHead({
  title: 'About - 投資日記'
})
</script>
