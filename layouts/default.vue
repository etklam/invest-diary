<template>
  <div class="min-h-screen bg-gray-50 dark:bg-slate-950">
    <!-- Show loader while auth is initializing -->
    <AuthLoader v-if="!isInitialized" />

    <!-- Show main content once auth is ready -->
    <template v-else>
      <PWAInstallPrompt />
      <!-- Render Navigation only after user info is fully synced -->
      <Navigation v-if="isInitialized" />
      <main class="container mx-auto px-4 py-8" :class="{ 'pt-24': showInstallPrompt }">
        <slot />
      </main>
      <Toast :toasts="toasts" @remove="removeToast" />
      <PWAUpdatePrompt />
      <AlertNotification
        v-if="currentAlert"
        :message="currentAlert.message"
        :show="showAlert"
        @close="dismissCurrentAlert"
      />
      <!-- Floating Quick Diary Button -->
      <button
        v-if="isAuthenticated"
        @click="showQuickDiaryModal = true"
        :aria-label="$t('diary.quickDiary')"
        class="fixed bottom-6 right-6 z-40 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
        :title="$t('diary.quickDiary')"
      >
        <Icon name="heroicons:bolt" class="h-6 w-6 group-hover:scale-110 transition-transform" />
      </button>
      <!-- Quick Diary Modal -->
      <QuickDiaryModal
        :show="showQuickDiaryModal"
        @close="showQuickDiaryModal = false"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
const { toasts, removeToast } = useToast()
const { user, fetchMe, isInitialized, isAuthenticated } = useAuth()
const showInstallPrompt = ref(false)
const showQuickDiaryModal = ref(false)
const route = useRoute()

import { useAlerts } from '~/composables/useAlerts'

const {
  currentAlert,
  showAlert,
  enqueueAlerts,
  dismissCurrentAlert,
  applyBackoff,
  scheduleNextPoll,
  checkDailyReset,
  setBaseInterval
} = useAlerts()

// Polling is handled by useAlerts composable

// Check if route requires authentication using route meta
// Falls back to path-based detection for pages without meta
const isPublicRoute = computed(() => {
  // First check route meta
  const meta = route.meta
  if (meta?.requiresAuth === false) {
    return true
  }
  if (meta?.requiresAuth === true) {
    return false
  }

  // Fallback: path-based detection for backward compatibility
  const publicPaths = ['/', '/blog', '/about', '/auth/login', '/auth/register', '/tools']
  const path = route.path
  return publicPaths.some(r => path === r || path.startsWith(r + '/'))
})

// daily reset handled by composable




// Check for due alerts (queue-based)
const checkForDueAlerts = async () => {
  if (!isAuthenticated.value || isPublicRoute.value) return

  checkDailyReset()

  try {
    const alerts = await $fetch<any[]>('/api/alerts')

    if (!alerts || alerts.length === 0) {
      applyBackoff(checkForDueAlerts)
      return
    }

    enqueueAlerts(alerts)
    setBaseInterval()
    scheduleNextPoll(checkForDueAlerts)
  } catch (error: any) {
    if (error?.statusCode === 401) {
      user.value = null
    }
    console.error('Error checking for alerts:', error)
    applyBackoff(checkForDueAlerts)
  }
}

// dismiss handled by composable

// Start polling
const startPolling = () => {
  checkForDueAlerts()
}

// Stop polling
const stopPolling = () => {
  // handled by composable
}

// Smart polling: start/stop based on auth state and route changes
watch(
  [isAuthenticated, isPublicRoute],
  ([authenticated, publicRoute]) => {
    if (authenticated && !publicRoute) {
      // Authenticated user on protected route - start polling
      startPolling()
    } else {
      // Public route or not authenticated - stop polling
      stopPolling()
    }
  },
  { immediate: true }
)

// Fetch current user on mount only if not already initialized
onMounted(async () => {
  const { isInitialized } = useAuth()
  if (!isInitialized.value) {
    await fetchMe()
  }
})

// cleanup handled by composable
</script>
