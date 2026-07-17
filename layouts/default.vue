<template>
  <div class="default-shell min-h-screen">
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
        class="mx-auto w-full max-w-[1240px] px-4 py-8 pb-28 sm:px-6 lg:px-8 xl:pb-8"
        :class="{ 'pt-24': showInstallPrompt }"
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
      <!-- Floating Quick Diary Button -->
      <button
        v-if="isAuthenticated"
        @click="openFloatingQuickDiary"
        :aria-label="$t('diary.quickDiary')"
        class="fixed right-6 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-dt-lg transition-colors duration-200 group hover:opacity-90 xl:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
        style="background: var(--color-accent);"
        :title="$t('diary.quickDiary')"
      >
        <Icon name="heroicons:pencil-square" class="h-6 w-6 group-hover:scale-110 transition-transform" />
      </button>
      <!-- Quick Diary Modal -->
      <QuickDiaryModal
        :show="showQuickDiaryModal"
        :context="quickDiaryContext"
        @close="closeFloatingQuickDiary"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { QuickDiaryContext } from '~/types/quicknote'

const { toasts, removeToast } = useToast()
const { isInitialized, isAuthenticated } = useAuth()
const { canInstall } = useAppPWA()
const showInstallPrompt = ref(false)
const showQuickDiaryModal = ref(false)
const quickDiaryContext = ref<QuickDiaryContext | null>(null)

import { useAlerts } from '~/composables/useAlerts'

const {
  currentAlert,
  showAlert,
  dismissCurrentAlert,
} = useAlerts()

watch(canInstall, (value) => {
  showInstallPrompt.value = value
}, { immediate: true })

function openFloatingQuickDiary() {
  quickDiaryContext.value = { source: 'floating' }
  showQuickDiaryModal.value = true
}

function closeFloatingQuickDiary() {
  showQuickDiaryModal.value = false
  // Reset after close so the next open never inherits a prior date/source
  quickDiaryContext.value = null
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false

  if (target.isContentEditable) return true

  const interactiveTags = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
  if (interactiveTags.has(target.tagName)) return true

  return Boolean(target.closest('[contenteditable="true"], [role="textbox"]'))
}

// Cmd/Ctrl+K keyboard shortcut to open Quick Diary
const handleKeydown = (e: KeyboardEvent) => {
  if (e.defaultPrevented || e.isComposing) return
  if (e.altKey || e.shiftKey) return
  if (isEditableTarget(e.target)) return
  if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return
  if (!isAuthenticated.value) return

  e.preventDefault()
  if (showQuickDiaryModal.value) {
    closeFloatingQuickDiary()
  } else {
    openFloatingQuickDiary()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.default-shell {
  background: var(--color-background);
}
</style>
