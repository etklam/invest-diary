<script setup lang="ts">
import DesktopNav from './nav/DesktopNav.vue'
import MobileNav from './nav/MobileNav.vue'

const { t } = useI18n()
const route = useRoute()
const isHomeRoute = computed(() => route.path === '/')

// Mobile menu state
const mobileNavOpen = ref(false)
</script>

<template>
  <nav class="sticky z-40 px-3 sm:px-4 lg:px-6" :class="isHomeRoute ? 'top-3' : 'top-4'">
    <DesktopNav>
      <template #mobile-trigger>
        <div class="ml-auto flex xl:hidden">
          <button
            @click="mobileNavOpen = !mobileNavOpen"
            class="flex cursor-pointer items-center rounded-xl border bg-white/80 p-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
            :class="isHomeRoute
              ? 'border-sky-100 text-sky-700 hover:bg-sky-50 dark:text-sky-200'
              : 'border-cyan-100 text-cyan-700 hover:bg-cyan-50 dark:text-cyan-200'"
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
