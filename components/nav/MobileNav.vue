<script setup lang="ts">
import NavLogo from './NavLogo.vue'
import ThemeToggle from './ThemeToggle.vue'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()
const { mainNavItems, toolNavItems, isActive, isAuthenticated } = useNavigation()
const { user, logout } = useAuth()
const route = useRoute()
const isHomeRoute = computed(() => route.path === '/')

const getIconName = (icon: string) => `heroicons:${icon}`

const handleLogout = async () => {
  emit('close')
  await logout()
}

// Close on route change
watch(() => route.path, () => {
  emit('close')
})
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed bottom-0 left-0 top-0 z-50 w-[82%] sm:max-w-xs lg:w-80"
  >
    <!-- Backdrop -->
    <div
      @click="emit('close')"
      class="fixed inset-0 bg-slate-900/25 backdrop-blur-[1px]"
    />

    <!-- Mobile Nav Content -->
    <nav
      class="relative flex h-full w-full flex-col overflow-y-auto border-r pb-8 pt-5 shadow-2xl backdrop-blur-xl sm:pt-6"
      :class="isHomeRoute
        ? 'border-sky-100 bg-sky-50/95 shadow-sky-200/30 dark:border-slate-700 dark:bg-slate-900/95'
        : 'border-cyan-100 bg-white/95 shadow-cyan-200/30 dark:border-slate-700 dark:bg-slate-900/95'"
    >
      <div
        class="mb-5 flex w-full items-center border-b px-5 pb-5 sm:px-6 sm:pb-6"
        :class="isHomeRoute ? 'border-sky-100 dark:border-slate-700' : 'border-cyan-100 dark:border-slate-700'"
      >
        <NavLogo is-mobile @click="emit('close')" />
      </div>

      <div class="px-3 pb-6 sm:px-4">
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {{ t('nav.home') }}
        </h3>
        <ul class="mb-8 text-sm font-medium">
          <li v-for="item in mainNavItems" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="flex items-center rounded-xl px-3 py-2.5 pr-4 text-sm text-slate-700 transition-colors duration-200 dark:text-slate-200 dark:hover:bg-slate-800"
              :class="[
                isHomeRoute ? 'hover:bg-sky-100/80' : 'hover:bg-cyan-50',
                isActive(item.to)
                  ? (isHomeRoute ? 'bg-sky-600 text-white dark:bg-sky-700 dark:text-slate-100' : 'bg-cyan-600 text-white dark:bg-cyan-700 dark:text-slate-100')
                  : ''
              ]"
              @click="emit('close')"
            >
              <Icon :name="getIconName(item.icon)" class="mr-3 h-5 w-5" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>

        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {{ t('nav.tools') }}
        </h3>
        <ul class="text-sm font-medium">
          <li v-for="item in toolNavItems" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="flex items-center rounded-xl px-3 py-2.5 pr-2 text-sm text-slate-700 transition-colors duration-200 dark:text-slate-200 dark:hover:bg-slate-800"
              :class="[
                isHomeRoute ? 'hover:bg-sky-100/80' : 'hover:bg-cyan-50',
                isActive(item.to)
                  ? (isHomeRoute ? 'bg-sky-600 text-white dark:bg-sky-700 dark:text-slate-100' : 'bg-cyan-600 text-white dark:bg-cyan-700 dark:text-slate-100')
                  : ''
              ]"
              @click="emit('close')"
            >
              <Icon :name="getIconName(item.icon)" class="mr-3 h-5 w-5" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>

      <!-- Mobile Auth Section -->
      <div class="px-3 sm:px-4">
        <div class="border-t pt-8 dark:border-slate-700" :class="isHomeRoute ? 'border-sky-100' : 'border-cyan-100'">
          <!-- Language & Theme -->
          <div class="flex items-center justify-between mb-4">
            <LanguageSwitcher dropdown-position="left" />
            <ThemeToggle />
          </div>

          <template v-if="isAuthenticated">
            <div class="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
              {{ t('auth.loggedInAs') }}
            </div>
            <div class="px-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-medium">
              {{ user?.name || user?.email }}
            </div>
            <NuxtLink
              to="/settings"
              class="mt-2 flex items-center rounded-xl px-3 py-3 pr-2 text-slate-700 transition-colors dark:text-slate-200 dark:hover:bg-slate-800"
              :class="isHomeRoute ? 'hover:bg-sky-100/80' : 'hover:bg-cyan-50'"
              @click="emit('close')"
            >
              <Icon name="heroicons:cog-6-tooth" class="mr-3 h-5 w-5" />
              <span>{{ t('nav.settings') }}</span>
            </NuxtLink>
            <button
              @click="handleLogout"
              class="flex w-full cursor-pointer items-center rounded-xl px-3 py-3 pr-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800"
            >
              <Icon name="heroicons:arrow-right-on-rectangle" class="mr-3 h-5 w-5" />
              <span>{{ t('nav.logout') }}</span>
            </button>
          </template>
          <template v-else>
            <NuxtLink
              to="/auth/login"
              class="flex items-center rounded-xl px-3 py-3 pr-2 text-slate-700 transition-colors dark:text-slate-200 dark:hover:bg-slate-800"
              :class="isHomeRoute ? 'hover:bg-sky-100/80' : 'hover:bg-cyan-50'"
              @click="emit('close')"
            >
              <Icon name="heroicons:arrow-left-on-rectangle" class="mr-3 h-5 w-5" />
              <span>{{ t('auth.login') }}</span>
            </NuxtLink>
            <NuxtLink
              to="/auth/register"
              class="flex items-center rounded-xl px-3 py-3 pr-2 text-white transition-colors dark:text-slate-950 font-semibold"
              :class="isHomeRoute
                ? 'bg-orange-500 hover:bg-orange-400 dark:bg-orange-600 dark:hover:bg-orange-500'
                : 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500'"
              @click="emit('close')"
            >
              <Icon name="heroicons:user-plus" class="mr-3 h-5 w-5" />
              <span>{{ t('auth.register') }}</span>
            </NuxtLink>
          </template>
        </div>
      </div>
    </nav>
  </div>
</template>
