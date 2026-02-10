<script setup lang="ts">
import { ref, onBeforeMount, onMounted } from 'vue'

const showInstallPrompt = ref(false)
const deferredPrompt = ref<any>(null)
const isInstalled = ref(false)

// Check if app is already installed
const checkIfInstalled = () => {
  // Check if running in standalone mode (already installed)
  isInstalled.value = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true
}

const onBeforeInstallPrompt = (e: Event) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault()
  // Stash the event so it can be triggered later
  deferredPrompt.value = e
  // Show the install prompt
  showInstallPrompt.value = true
}

const installApp = async () => {
  if (!deferredPrompt.value) {
    return
  }

  // Show the install prompt
  deferredPrompt.value.prompt()

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.value.userChoice

  if (outcome === 'accepted') {
    console.log('User accepted the install prompt')
  } else {
    console.log('User dismissed the install prompt')
  }

  // Clear the deferredPrompt
  deferredPrompt.value = null
  showInstallPrompt.value = false
}

const dismissPrompt = () => {
  showInstallPrompt.value = false
  // Store dismissal in localStorage so we don't show it again for a while
  localStorage.setItem('pwa-install-dismissed', Date.now().toString())
}

onBeforeMount(() => {
  checkIfInstalled()

  // Check if user recently dismissed the prompt (don't show for 7 days)
  const dismissed = localStorage.getItem('pwa-install-dismissed')
  if (dismissed) {
    const daysSinceDismissal = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24)
    if (daysSinceDismissal < 7) {
      return
    }
  }
})

onMounted(() => {
  // Only show prompt on supported browsers and if not already installed
  if (!isInstalled.value) {
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
})

// Expose for use in parent components
defineExpose({
  installApp,
  showInstallPrompt
})
</script>

<template>
  <!-- Banner style install prompt -->
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="transform -translate-y-full"
    enter-to-class="transform translate-y-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="transform translate-y-0"
    leave-to-class="transform -translate-y-full"
  >
    <div
      v-if="showInstallPrompt && !isInstalled"
      class="fixed top-0 left-0 right-0 z-50 p-4 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 shadow-lg"
    >
      <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <img src="/icon-192x192.png" alt="App Icon" class="w-12 h-12 rounded-lg">
          <div class="text-white">
            <p class="font-semibold">安裝投資日記</p>
            <p class="text-sm opacity-90">將應用程式安裝到主畫面，獲得更好的體驗</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            @click="dismissPrompt"
            class="px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            稍後
          </button>
          <button
            @click="installApp"
            class="px-4 py-2 text-sm font-medium bg-white text-blue-600 hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
          >
            安裝
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
