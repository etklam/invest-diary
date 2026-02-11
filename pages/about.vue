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

    <!-- Mission Section -->
    <section class="py-16 sm:py-24">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-12">
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {{ $t('about.mission.title') }}
            </h2>
          </div>
          <div class="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-8 sm:p-12 shadow-lg">
            <p class="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              {{ $t('about.mission.content') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Story Section -->
    <section class="py-16 sm:py-24 bg-gray-50 dark:bg-gray-800">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-12">
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {{ $t('about.story.title') }}
            </h2>
          </div>
          <div class="prose prose-lg dark:prose-invert max-w-none">
            <p class="text-gray-700 dark:text-gray-300 mb-4">
              {{ $t('about.story.paragraph1') }}
            </p>
            <p class="text-gray-700 dark:text-gray-300 mb-4">
              {{ $t('about.story.paragraph2') }}
            </p>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t('about.story.paragraph3') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Detail Section -->
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

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Feature Detail 1 -->
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

            <!-- Feature Detail 2 -->
            <div class="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-start mb-4">
                <div class="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                  <Icon name="heroicons:calculator" class="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ $t('about.features.fifo.title') }}
                </h3>
              </div>
              <p class="text-gray-600 dark:text-gray-400">
                {{ $t('about.features.fifo.description') }}
              </p>
            </div>

            <!-- Feature Detail 3 -->
            <div class="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-start mb-4">
                <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                  <Icon name="heroicons:bolt" class="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ $t('about.features.realtime.title') }}
                </h3>
              </div>
              <p class="text-gray-600 dark:text-gray-400">
                {{ $t('about.features.realtime.description') }}
              </p>
            </div>

            <!-- Feature Detail 4 -->
            <div class="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div class="flex items-start mb-4">
                <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                  <Icon name="heroicons:lock-closed" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ $t('about.features.privacy.title') }}
                </h3>
              </div>
              <p class="text-gray-600 dark:text-gray-400">
                {{ $t('about.features.privacy.description') }}
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

    <!-- Contact CTA -->
    <section class="py-16 sm:py-24">
      <div class="container mx-auto px-4">
        <div class="max-w-3xl mx-auto text-center">
          <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            {{ $t('about.contact.title') }}
          </h2>
          <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
            {{ $t('about.contact.description') }}
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <NuxtLink
              to="/auth/register"
              class="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors min-h-[52px] shadow-lg"
            >
              {{ $t('about.contact.getStarted') }}
              <Icon name="heroicons:arrow-right" class="ml-2 w-5 h-5" />
            </NuxtLink>
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
useHead({
  title: 'About Us - 投資日記'
})
</script>
