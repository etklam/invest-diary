<script setup lang="ts">
import DesktopNav from './nav/DesktopNav.vue'
import MobileNav from './nav/MobileNav.vue'

const { t } = useI18n()

// Mobile menu state
const mobileNavOpen = ref(false)
</script>

<template>
  <nav class="sticky top-4 z-40 px-3 sm:px-4 lg:px-6">
    <DesktopNav>
      <template #mobile-trigger>
        <div class="ml-auto flex xl:hidden">
          <button
            @click="mobileNavOpen = !mobileNavOpen"
            class="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-dt-sm border border-dt-border bg-dt-surface p-2 text-dt-text transition-colors duration-200 hover:bg-dt-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30"
            :aria-label="mobileNavOpen ? t('theme.closeMenu') : t('theme.openMenu')"
          >
            <Icon
              :name="mobileNavOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'"
              class="block h-6 w-6"
            />
          </button>
        </div>
      </template>
    </DesktopNav>

    <MobileNav
      :is-open="mobileNavOpen"
      @close="mobileNavOpen = false"
    />
  </nav>
</template>
