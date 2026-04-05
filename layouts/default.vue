<template>
  <div class="default-shell min-h-screen">
    <!-- Show loader while auth is initializing -->
    <AuthLoader v-if="!isInitialized" />

    <!-- Show main content once auth is ready -->
    <template v-else>
      <PWAInstallPrompt />
      <!-- Render Navigation only after user info is fully synced -->
      <Navigation v-if="isInitialized" />
      <main class="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8" :class="{ 'pt-24': showInstallPrompt }">
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
        class="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 group"
        style="background: var(--color-accent); box-shadow: 0 18px 34px color-mix(in srgb, var(--color-accent) 30%, transparent);"
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
import { ref } from 'vue'

const { toasts, removeToast } = useToast()
const { isInitialized, isAuthenticated } = useAuth()
const { canInstall } = useAppPWA()
const showInstallPrompt = ref(false)
const showQuickDiaryModal = ref(false)

import { useAlerts } from '~/composables/useAlerts'

const {
  currentAlert,
  showAlert,
  dismissCurrentAlert,
} = useAlerts()

watch(canInstall, (value) => {
  showInstallPrompt.value = value
}, { immediate: true })

// cleanup handled by composable
</script>

<style scoped>
.default-shell {
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--color-secondary) 10%, transparent), transparent 28%),
    var(--color-background);
}
</style>
