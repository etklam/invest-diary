<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Show loader while auth is initializing -->
    <AuthLoader v-if="!isInitialized" />
    
    <!-- Show main content once auth is ready -->
    <template v-else>
      <PWAInstallPrompt />
      <Navigation />
      <main class="container mx-auto px-4 py-8" :class="{ 'pt-24': showInstallPrompt }">
        <slot />
      </main>
      <Toast :toasts="toasts" @remove="removeToast" />
      <PWAReloadPrompt />
      <AlertNotification
        v-if="dueAlert"
        :message="dueAlert.message"
        :show="showAlert"
        @close="dismissCurrentAlert"
      />
      <!-- Floating Quick Diary Button -->
      <button
        v-if="isAuthenticated"
        @click="showQuickDiaryModal = true"
        class="fixed bottom-6 right-6 z-40 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
        title="快速日記"
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
const dueAlert = ref<any>(null)
const showAlert = ref(false)
const processedAlerts = ref<Set<string>>(new Set())
let pollInterval: ReturnType<typeof setInterval> | null = null

// Fetch current user on mount only if not already initialized
onMounted(async () => {
  const { isInitialized } = useAuth()
  if (!isInitialized.value) {
    await fetchMe()
  }
})

// Check for due alerts
const checkForDueAlerts = async () => {
  try {
    const alerts = await $fetch('/api/alerts') as any[]
    if (!alerts || alerts.length === 0) return

    const now = new Date()
    const due = alerts.find((alert: any) => {
      const triggerTime = new Date(alert.trigger_at)
      return (
        triggerTime <= now &&
        !alert.is_dismissed &&
        !processedAlerts.value.has(alert.id.toString())
      )
    })

    if (due && due.id !== dueAlert.value?.id) {
      dueAlert.value = due
      showAlert.value = true
      processedAlerts.value.add(due.id.toString())
    }
  } catch (error: any) {
    // If 401 Unauthorized, redirect to home page
    if (error?.statusCode === 401) {
      user.value = null
      await navigateTo('/')
    }
    console.error('Error checking for alerts:', error)
  }
}

const dismissCurrentAlert = async () => {
  showAlert.value = false
  if (dueAlert.value) {
    try {
      await $fetch(`/api/alerts/${dueAlert.value.id}/dismiss`, {
        method: 'PUT'
      })
    } catch (error: any) {
      // If 401 Unauthorized, redirect to home page
      if (error?.statusCode === 401) {
        user.value = null
        await navigateTo('/')
      }
      console.error('Error dismissing alert:', error)
    }
    dueAlert.value = null
  }
}

// Start polling when component mounts
onMounted(() => {
  // Check immediately
  checkForDueAlerts()
  // Then poll every 30 seconds
  pollInterval = setInterval(checkForDueAlerts, 30000)
})

// Stop polling when component unmounts
onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script>
