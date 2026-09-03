<template>
  <div class="default-shell min-h-screen min-w-0">
    <!-- Skip to main content (accessibility) -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      style="background: var(--color-primary); color: var(--color-on-ink);"
    >
      {{ $t('common.skipToContent') }}
    </a>

    <!-- Show loader while auth is initializing -->
    <AuthLoader v-if="!isInitialized" />

    <!-- Show main content once auth is ready -->
    <template v-else>
      <PWAInstallPrompt />
      <!-- Render Navigation only after user info is fully synced -->
      <Navigation v-if="isInitialized" />
      <main
        id="main-content"
        class="min-w-0 w-full py-8 pb-28 xl:pb-8"
        :class="[
          { 'pt-24': showInstallPrompt },
          { 'max-[639px]:pt-14': showAlert },
        ]"
      >
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
      <BottomNavigation v-if="isAuthenticated" class="xl:hidden" />
      <QuickDiaryModal
        :show="showQuickDiary"
        :context="quickDiaryContext"
        @close="closeQuickDiary"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { isQuickDiaryShortcut } from '~/lib/quicknote/shortcut'
import { useAppShell } from '~/composables/useAppShell'

const { toasts, removeToast } = useToast()
const { isInitialized, isAuthenticated } = useAuth()
const { canInstall } = useAppPWA()
const showInstallPrompt = ref(false)
const {
  showQuickDiary,
  quickDiaryContext,
  openQuickDiary,
  closeQuickDiary,
} = useAppShell()

import { useAlerts } from '~/composables/useAlerts'

const {
  currentAlert,
  showAlert,
  dismissCurrentAlert,
} = useAlerts()

watch(canInstall, (value) => {
  showInstallPrompt.value = value
}, { immediate: true })

const handleKeydown = (e: KeyboardEvent) => {
  if (!isAuthenticated.value || !isQuickDiaryShortcut(e)) return

  e.preventDefault()
  openQuickDiary()
}

watch(isAuthenticated, (authenticated) => {
  if (!authenticated) closeQuickDiary()
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.default-shell {
  min-width: 0;
  background: var(--color-background);
}
</style>
