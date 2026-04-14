<template>
  <div class="min-h-screen bg-surface text-copy selection:bg-accent/20 selection:text-inherit transition-colors duration-standard">
    <!-- Show loader while auth is initializing -->
    <AuthLoader v-if="!isInitialized" />

    <!-- Show main content once auth is ready -->
    <template v-else>
      <PWAInstallPrompt />
      
      <!-- Desktop Header -->
      <header class="sticky top-0 z-sticky hidden md:block w-full h-16 bg-surface border-b border-line">
        <div class="mx-auto h-full max-w-content px-6 flex items-center justify-between">
          <Navigation />
        </div>
      </header>

      <!-- Mobile Header (Optional, for Title/Logo) -->
      <header class="sticky top-0 z-sticky md:hidden w-full h-14 bg-surface border-b border-line flex items-center px-4">
        <h1 class="text-lg font-semibold tracking-tight">{{ publicConfig.appName }}</h1>
        <div class="ml-auto flex items-center gap-4">
          <UserMenu />
        </div>
      </header>

      <main class="mx-auto w-full max-w-content px-4 py-8 md:px-8" :class="{ 'pt-14 md:pt-16': showInstallPrompt }">
        <slot />
      </main>

      <!-- Global UI Components -->
      <Toast :toasts="toasts" @remove="removeToast" />
      <PWAUpdatePrompt />
      <AlertNotification
        v-if="currentAlert"
        :message="currentAlert.message"
        :show="showAlert"
        @close="dismissCurrentAlert"
      />

      <!-- Floating Action Button (Mobile Only) -->
      <button
        v-if="isAuthenticated"
        @click="showQuickDiaryModal = true"
        :aria-label="$t('diary.quickDiary')"
        class="fixed bottom-24 right-6 md:hidden z-toast flex h-14 w-14 items-center justify-center bg-accent text-copy-inverse border border-accent rounded-none transition-all duration-fast hover:bg-accent-hover active:scale-95 focus:ring-2 focus:ring-accent focus:ring-offset-2"
        :title="$t('diary.quickDiary')"
      >
        <Icon name="lucide:plus" class="h-6 w-6" />
      </button>

      <!-- Bottom Navigation (Mobile Only) -->
      <BottomNavigation class="md:hidden" />

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
const { isInitialized, isAuthenticated } = useAuth()
const { canInstall } = useAppPWA()
const showInstallPrompt = ref(false)
const showQuickDiaryModal = ref(false)
const runtimeConfig = useRuntimeConfig()
const publicConfig = runtimeConfig.public

const {
  currentAlert,
  showAlert,
  dismissCurrentAlert,
} = useAlerts()

watch(canInstall, (value) => {
  showInstallPrompt.value = value
}, { immediate: true })
</script>
