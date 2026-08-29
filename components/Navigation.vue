<script setup lang="ts">
import DesktopNav from './nav/DesktopNav.vue'
import MobileNav from './nav/MobileNav.vue'
import { useAppShell } from '~/composables/useAppShell'

const { t } = useI18n()

const {
  showMobileNavigation,
  openMobileNavigation,
  closeMobileNavigation,
} = useAppShell()
</script>

<template>
  <nav :aria-label="t('nav.label')" class="sticky top-4 z-40 px-3 sm:px-4 lg:px-6">
    <DesktopNav>
      <template #mobile-trigger>
        <div class="ml-auto flex xl:hidden">
          <button
            @click="showMobileNavigation ? closeMobileNavigation() : openMobileNavigation()"
            class="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-dt-sm border border-dt-border bg-dt-surface p-2 text-dt-text transition-colors duration-200 hover:bg-dt-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30"
            :aria-label="showMobileNavigation ? t('theme.closeMenu') : t('theme.openMenu')"
            :aria-expanded="showMobileNavigation"
            aria-haspopup="dialog"
          >
            <Icon
              :name="showMobileNavigation ? 'heroicons:x-mark' : 'heroicons:bars-3'"
              class="block h-6 w-6"
            />
          </button>
        </div>
      </template>
    </DesktopNav>

    <MobileNav
      :is-open="showMobileNavigation"
      @close="closeMobileNavigation"
    />
  </nav>
</template>
