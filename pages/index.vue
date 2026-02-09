<template>
  <div class="min-h-screen">
    <!-- Hero Section -->
    <section class="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900 text-white py-20 sm:py-32">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto text-center">
          <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
            {{ $t('home.hero.title') }}
          </h1>
          <p class="text-lg sm:text-xl md:text-2xl mb-8 text-indigo-100 dark:text-indigo-200">
            {{ $t('home.hero.subtitle') }}
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <NuxtLink
              to="/auth/register"
              class="inline-flex items-center justify-center px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors min-h-[52px] shadow-lg"
            >
              {{ $t('home.hero.getStarted') }}
              <Icon name="heroicons:arrow-right" class="ml-2 w-5 h-5" />
            </NuxtLink>
            <NuxtLink
              to="/about"
              class="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors min-h-[52px]"
            >
              {{ $t('home.hero.learnMore') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-16 sm:py-24 bg-white dark:bg-gray-900">
      <div class="container mx-auto px-4">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {{ $t('home.features.title') }}
          </h2>
          <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {{ $t('home.features.subtitle') }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <!-- Feature 1 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 hover:shadow-xl transition-shadow">
            <div class="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center mb-6">
              <Icon name="heroicons:calendar-days" class="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {{ $t('home.features.diary.title') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              {{ $t('home.features.diary.description') }}
            </p>
          </div>

          <!-- Feature 2 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 hover:shadow-xl transition-shadow">
            <div class="w-14 h-14 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mb-6">
              <Icon name="heroicons:chart-bar" class="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {{ $t('home.features.stocks.title') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              {{ $t('home.features.stocks.description') }}
            </p>
          </div>

          <!-- Feature 3 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 hover:shadow-xl transition-shadow">
            <div class="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center mb-6">
              <Icon name="heroicons:bell" class="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {{ $t('home.features.alerts.title') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              {{ $t('home.features.alerts.description') }}
            </p>
          </div>

          <!-- Feature 4 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 hover:shadow-xl transition-shadow">
            <div class="w-14 h-14 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mb-6">
              <Icon name="heroicons:clock" class="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {{ $t('home.features.timeline.title') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              {{ $t('home.features.timeline.description') }}
            </p>
          </div>

          <!-- Feature 5 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 hover:shadow-xl transition-shadow">
            <div class="w-14 h-14 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center mb-6">
              <Icon name="heroicons:shield-check" class="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {{ $t('home.features.security.title') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              {{ $t('home.features.security.description') }}
            </p>
          </div>

          <!-- Feature 6 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 hover:shadow-xl transition-shadow">
            <div class="w-14 h-14 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-6">
              <Icon name="heroicons:moon" class="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {{ $t('home.features.themes.title') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              {{ $t('home.features.themes.description') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-16 sm:py-24 bg-gray-50 dark:bg-gray-800">
      <div class="container mx-auto px-4">
        <div class="max-w-3xl mx-auto text-center">
          <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            {{ $t('home.cta.title') }}
          </h2>
          <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
            {{ $t('home.cta.description') }}
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <NuxtLink
              to="/auth/register"
              class="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors min-h-[52px] shadow-lg"
            >
              {{ $t('home.cta.register') }}
              <Icon name="heroicons:arrow-right" class="ml-2 w-5 h-5" />
            </NuxtLink>
            <NuxtLink
              to="/auth/login"
              class="inline-flex items-center justify-center px-8 py-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors min-h-[52px] shadow-lg border border-gray-300 dark:border-gray-600"
            >
              {{ $t('home.cta.login') }}
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
            <NuxtLink to="/about" class="hover:text-white transition-colors">
              {{ $t('nav.about') }}
            </NuxtLink>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">
              GitHub
            </a>
          </div>
        </div>
        <div class="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
          &copy; {{ new Date().getFullYear() }} {{ $t('common.appName') }}. {{ $t('home.footer.rights') }}
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Redirect authenticated users to calendar
const { isAuthenticated } = useAuth()

onMounted(() => {
  if (isAuthenticated.value) {
    navigateTo('/calendar')
  }
})
</script>
