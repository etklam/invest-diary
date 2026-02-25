<script setup lang="ts">
const { t } = useI18n()
const colorMode = useColorMode()
const { isAuthenticated, user } = useAuth()
const { visibleNavItems, isActive } = useNavigation()
const { getTimezoneInfo } = useTimezone()

// Mobile menu state
const mobileNavOpen = ref(false)

// User dropdown state
const userMenuOpen = ref(false)

// Get current timezone info
const currentTimezone = computed(() => {
  return getTimezoneInfo(user.value?.timezone)
})

// Close mobile menu when route changes
const route = useRoute()
watch(() => route.path, () => {
  mobileNavOpen.value = false
})

// Navigation items for main nav
const mainNavItems = computed(() => {
  if (!isAuthenticated.value) {
    return [
      { label: t('nav.home'), to: '/', icon: 'home' },
      { label: t('nav.blog'), to: '/blog', icon: 'document' }
    ]
  }

  return [
    { label: t('nav.calendar'), to: '/calendar', icon: 'calendar' },
    { label: t('nav.timeline'), to: '/timeline', icon: 'clock' },
    { label: t('nav.diaries'), to: '/diaries', icon: 'document-text' },
    { label: t('nav.stocks'), to: '/stocks', icon: 'chart-bar' }
  ]
})

// Navigation items for secondary nav
const secondaryNavItems = computed(() => {
  if (!isAuthenticated.value) {
    return [
      { label: t('nav.about'), to: '/about', icon: 'information-circle' },
      { label: t('nav.positionSizing'), to: '/tools/position-sizing', icon: 'calculator' },
      { label: t('nav.seasonality'), to: '/tools/seasonality', icon: 'chart-bar' }
    ]
  }

  const items = [
    { label: t('nav.discipline'), to: '/discipline', icon: 'light-bulb' },
    { label: t('nav.alerts'), to: '/alerts', icon: 'bell' },
    { label: t('nav.blog'), to: '/blog', icon: 'document-text' },
    { label: t('nav.positionSizing'), to: '/tools/position-sizing', icon: 'calculator' },
    { label: t('nav.seasonality'), to: '/tools/seasonality', icon: 'chart-bar' }
  ]

  if (user.value?.role === 'ADMIN') {
    items.push(
      { label: t('nav.admin'), to: '/admin', icon: 'cog' },
      { label: t('nav.manageBlog'), to: '/admin/blog', icon: 'pencil' }
    )
  }

  return items
})

// Get heroicon name from simple key
const getIconName = (icon: string) => {
  return `heroicons:${icon}`
}
</script>

<template>
  <nav class="sticky top-4 z-40 px-3 sm:px-4 lg:px-6">
    <div class="mx-auto w-full max-w-7xl">
      <!-- Primary Navigation Bar -->
      <div class="flex items-center rounded-2xl border border-cyan-100/80 bg-white/80 px-4 py-2.5 shadow-lg shadow-cyan-100/40 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/85 dark:shadow-slate-950/40 sm:px-5 sm:py-3">
        <!-- Logo -->
        <NuxtLink to="/" class="mr-6 flex-shrink-0 text-lg font-semibold tracking-tight text-cyan-900 transition-colors hover:text-cyan-700 dark:text-cyan-50 dark:hover:text-cyan-200 sm:mr-8 sm:text-xl">
          {{ $t('common.appName') }}
        </NuxtLink>

      <!-- Desktop Navigation -->
        <ul class="hidden xl:flex xl:items-center xl:gap-1.5">
          <li v-for="item in mainNavItems" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[0.925rem] font-medium text-slate-600 transition-all duration-200 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-cyan-200"
              :class="isActive(item.to) ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-700/30 hover:bg-cyan-600 hover:text-white dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-500' : ''"
            >
              <Icon :name="getIconName(item.icon)" class="h-[18px] w-[18px]" width="18" height="18" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>

      <!-- Desktop Right Side -->
        <ul class="mr-2 ml-auto hidden items-center gap-3 xl:flex">
        <!-- Language Switcher -->
        <li>
          <LanguageSwitcher />
        </li>

        <!-- Theme Toggle -->
        <li>
          <button
            @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
            class="cursor-pointer rounded-xl p-2 text-slate-500 transition-colors duration-200 hover:bg-cyan-50 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-cyan-200 dark:focus-visible:ring-offset-slate-900"
            :aria-label="$t('theme.toggleDarkMode')"
          >
            <Icon
              :name="colorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon'"
              class="h-5 w-5"
            />
          </button>
        </li>

        <!-- Authenticated User -->
        <li v-if="isAuthenticated">
          <div class="relative">
            <button
              @click="userMenuOpen = !userMenuOpen"
              class="flex cursor-pointer items-center rounded-xl border border-cyan-100/80 bg-white/70 py-1.5 pl-3 pr-2 transition-colors duration-200 hover:border-cyan-200 hover:bg-cyan-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
            >
              <div class="mr-3 text-right">
                <p class="max-w-[180px] truncate text-sm text-slate-900 dark:text-slate-100">{{ user?.name || user?.email }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-300">{{ user?.role === 'ADMIN' ? $t('nav.admin') : $t('nav.users') }}</p>
                <p class="text-xs text-slate-400 dark:text-slate-400">{{ currentTimezone.label }}</p>
              </div>
              <div class="mr-2">
                <div class="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-600 dark:bg-cyan-500">
                  <span class="text-white font-medium">
                    {{ (user?.name || user?.email)?.charAt(0).toUpperCase() }}
                  </span>
                </div>
              </div>
              <Icon
                name="heroicons:chevron-down"
                class="h-3 w-3 text-slate-500 dark:text-slate-300"
              />
            </button>

            <!-- User Dropdown Menu -->
            <div
              v-if="userMenuOpen"
              class="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-cyan-100 bg-white/95 py-1 shadow-lg shadow-cyan-100/50 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95"
            >
              <NuxtLink
                to="/settings"
                class="block cursor-pointer px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-cyan-50 dark:text-slate-200 dark:hover:bg-slate-700"
                @click="userMenuOpen = false"
              >
                {{ $t('nav.settings') }}
              </NuxtLink>
              <button
                @click="async () => { const { logout } = useAuth(); await logout(); userMenuOpen = false; }"
                class="block w-full cursor-pointer px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-700"
              >
                {{ $t('nav.logout') }}
              </button>
            </div>
          </div>
        </li>

        <!-- Guest Auth Buttons -->
        <template v-else>
          <li>
            <NuxtLink
              to="/auth/login"
              class="rounded px-2 py-1 text-sm text-slate-600 transition-colors duration-200 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:hover:text-cyan-200 dark:focus-visible:ring-offset-slate-900"
            >
              {{ $t('auth.login') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/auth/register"
              class="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-700/30 transition-colors duration-200 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 dark:focus:ring-offset-slate-900"
            >
              {{ $t('auth.register') }}
            </NuxtLink>
          </li>
        </template>
      </ul>

      <!-- Mobile Menu Button -->
      <div class="ml-auto flex xl:hidden">
        <button
          @click="mobileNavOpen = !mobileNavOpen"
          class="flex cursor-pointer items-center rounded-xl border border-cyan-100 bg-white/80 p-2 text-cyan-700 transition-colors duration-200 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-cyan-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
          :aria-label="mobileNavOpen ? $t('theme.closeMenu') : $t('theme.openMenu')"
        >
          <Icon
            :name="mobileNavOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'"
            class="block h-6 w-6"
          />
        </button>
      </div>
      </div>

      <!-- Secondary Navigation Bar (Desktop) -->
      <div class="mt-2 hidden rounded-2xl border border-cyan-100/70 bg-white/80 px-4 py-2.5 shadow-md shadow-cyan-100/30 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-slate-950/40 xl:block xl:px-5 xl:py-3">
        <div class="flex items-center">
          <ul class="flex items-center gap-1">
            <li v-for="item in secondaryNavItems" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-cyan-200"
                :class="isActive(item.to) ? 'bg-cyan-50 text-cyan-700 dark:bg-slate-800 dark:text-cyan-200' : ''"
              >
                <Icon :name="getIconName(item.icon)" class="h-[18px] w-[18px]" width="18" height="18" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </li>
          </ul>

          <!-- Quick Actions (right side) -->
          <ul class="ml-auto flex items-center space-x-3">
            <li v-if="isAuthenticated">
              <NuxtLink
                to="/settings"
                class="rounded-lg p-2 text-slate-600 transition-colors duration-200 hover:bg-cyan-50 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-cyan-200 dark:focus-visible:ring-offset-slate-900"
              >
                <Icon name="heroicons:cog-6-tooth" class="h-[18px] w-[18px]" width="18" height="18" />
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation Drawer -->
    <div
      :class="{ 'block': mobileNavOpen, 'hidden': !mobileNavOpen }"
      class="fixed bottom-0 left-0 top-0 z-50 w-[82%] sm:max-w-xs lg:w-80"
    >
      <!-- Backdrop -->
      <div
        @click="mobileNavOpen = false"
        class="fixed inset-0 bg-slate-900/25 backdrop-blur-[1px]"
      />

      <!-- Mobile Nav Content -->
      <nav class="relative flex h-full w-full flex-col overflow-y-auto border-r border-cyan-100 bg-white/95 pb-8 pt-5 shadow-2xl shadow-cyan-200/30 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 sm:pt-6">
        <div class="mb-5 flex w-full items-center border-b border-cyan-100 px-5 pb-5 dark:border-slate-700 sm:px-6 sm:pb-6">
          <NuxtLink to="/" class="text-xl font-semibold text-cyan-900 dark:text-cyan-50" @click="mobileNavOpen = false">
            {{ $t('common.appName') }}
          </NuxtLink>
        </div>

        <div class="px-3 pb-6 sm:px-4">
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {{ $t('nav.home') }}
          </h3>
          <ul class="mb-8 text-sm font-medium">
            <li v-for="item in mainNavItems" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="flex items-center rounded-xl px-3 py-2.5 pr-4 text-sm text-slate-700 transition-colors duration-200 hover:bg-cyan-50 dark:text-slate-200 dark:hover:bg-slate-800"
                :class="isActive(item.to) ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950' : ''"
                @click="mobileNavOpen = false"
              >
                <Icon :name="getIconName(item.icon)" class="mr-3 h-5 w-5" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </li>
          </ul>

          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {{ $t('common.search') }}
          </h3>
          <ul class="text-sm font-medium">
            <li v-for="item in secondaryNavItems" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="flex items-center rounded-xl px-3 py-2.5 pr-2 text-sm text-slate-700 transition-colors duration-200 hover:bg-cyan-50 dark:text-slate-200 dark:hover:bg-slate-800"
                :class="isActive(item.to) ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950' : ''"
                @click="mobileNavOpen = false"
              >
                <Icon :name="getIconName(item.icon)" class="mr-3 h-5 w-5" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Mobile Auth Section -->
        <div class="px-3 sm:px-4">
          <div class="border-t border-cyan-100 pt-8 dark:border-slate-700">
            <!-- Language & Theme -->
            <div class="flex items-center justify-between mb-4">
              <LanguageSwitcher dropdown-position="left" />
              <button
                @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
                class="cursor-pointer rounded-lg p-2 text-slate-600 transition-colors hover:bg-cyan-50 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-cyan-200 dark:focus-visible:ring-offset-slate-900"
                :aria-label="$t('theme.toggleDarkMode')"
              >
                <Icon
                  :name="colorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon'"
                  class="h-5 w-5"
                />
              </button>
            </div>

            <template v-if="isAuthenticated">
              <div class="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                {{ $t('auth.loggedInAs') }}
              </div>
              <div class="px-3 py-2 text-sm text-slate-900 dark:text-slate-100">
                {{ user?.name || user?.email }}
              </div>
              <NuxtLink
                to="/settings"
                class="mt-2 flex items-center rounded-xl px-3 py-3 pr-2 text-slate-700 transition-colors hover:bg-cyan-50 dark:text-slate-200 dark:hover:bg-slate-800"
                @click="mobileNavOpen = false"
              >
                <Icon name="heroicons:cog-6-tooth" class="mr-3 h-5 w-5" />
                <span>{{ $t('nav.settings') }}</span>
              </NuxtLink>
              <button
                @click="async () => { const { logout } = useAuth(); mobileNavOpen = false; await logout(); }"
                class="flex w-full cursor-pointer items-center rounded-xl px-3 py-3 pr-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800"
              >
                <Icon name="heroicons:arrow-right-on-rectangle" class="mr-3 h-5 w-5" />
                <span>{{ $t('nav.logout') }}</span>
              </button>
            </template>
            <template v-else>
              <NuxtLink
                to="/auth/login"
                class="flex items-center rounded-xl px-3 py-3 pr-2 text-slate-700 transition-colors hover:bg-cyan-50 dark:text-slate-200 dark:hover:bg-slate-800"
                @click="mobileNavOpen = false"
              >
                <Icon name="heroicons:arrow-left-on-rectangle" class="mr-3 h-5 w-5" />
                <span>{{ $t('auth.login') }}</span>
              </NuxtLink>
              <NuxtLink
                to="/auth/register"
                class="flex items-center rounded-xl bg-emerald-600 px-3 py-3 pr-2 text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                @click="mobileNavOpen = false"
              >
                <Icon name="heroicons:user-plus" class="mr-3 h-5 w-5" />
                <span>{{ $t('auth.register') }}</span>
              </NuxtLink>
            </template>
          </div>
        </div>
      </nav>
    </div>
  </nav>
</template>
