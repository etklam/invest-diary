<script setup lang="ts">
const { t } = useI18n()
const colorMode = useColorMode()
const { isAuthenticated, user } = useAuth()
const { isActive } = useNavigation()
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
const isHomeRoute = computed(() => route.path === '/')
const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})

// Navigation items for main nav
const mainNavItems = computed(() => {
  if (!isAuthenticated.value) {
    return [
      { label: t('nav.home'), to: '/', icon: 'home' },
      { label: t('nav.howToUse'), to: '/how-to-use', icon: 'map' },
      { label: t('nav.about'), to: '/about', icon: 'information-circle' },
      { label: t('nav.blog'), to: '/articles', icon: 'document' }
    ]
  }

  return [
    { label: t('nav.calendar'), to: '/calendar', icon: 'calendar' },
    { label: t('nav.timeline'), to: '/timeline', icon: 'clock' },
    { label: t('nav.diaries'), to: '/diaries', icon: 'document-text' },
    { label: t('nav.howToUse'), to: '/how-to-use', icon: 'map' },
    { label: t('nav.stocks'), to: '/stocks', icon: 'chart-bar' },
    { label: t('nav.about'), to: '/about', icon: 'information-circle' }
  ]
})

// Navigation items for secondary nav
const secondaryNavItems = computed(() => {
  if (!isAuthenticated.value) {
    return [
      { label: t('nav.financialFreedom'), to: '/tools/financial-freedom', icon: 'calculator' },
      { label: t('nav.positionSizing'), to: '/tools/position-sizing', icon: 'calculator' },
      { label: t('nav.seasonality'), to: '/tools/seasonality', icon: 'chart-bar' },
      { label: t('nav.etf'), to: '/tools/etf', icon: 'chart-bar' }
    ]
  }

  return [
    { label: t('nav.discipline'), to: '/discipline', icon: 'light-bulb' },
    { label: t('nav.alerts'), to: '/alerts', icon: 'bell' },
    { label: t('nav.blog'), to: '/articles', icon: 'document-text' },
    { label: t('nav.financialFreedom'), to: '/tools/financial-freedom', icon: 'calculator' },
    { label: t('nav.positionSizing'), to: '/tools/position-sizing', icon: 'calculator' },
    { label: t('nav.seasonality'), to: '/tools/seasonality', icon: 'chart-bar' },
    { label: t('nav.etf'), to: '/tools/etf', icon: 'chart-bar' }
  ]
})

const featuredSecondaryItems = computed(() => secondaryNavItems.value.slice(0, isAuthenticated.value ? 3 : 0))
const toolSecondaryItems = computed(() => secondaryNavItems.value.slice(isAuthenticated.value ? 3 : 0))

// Get heroicon name from simple key
const getIconName = (icon: string) => {
  return `heroicons:${icon}`
}

const themeToggleIcon = computed(() => {
  if (!isMounted.value) return 'heroicons:moon'
  return colorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon'
})
</script>

<template>
  <nav class="sticky z-40 px-3 sm:px-4 lg:px-6" :class="isHomeRoute ? 'top-3' : 'top-4'">
    <div class="mx-auto w-full max-w-7xl">
      <!-- Primary Navigation Bar -->
      <div
        class="relative z-30 flex items-center rounded-2xl px-4 py-2.5 backdrop-blur-xl sm:px-5 sm:py-3"
        :class="isHomeRoute
          ? 'border border-sky-200/70 bg-white/72 shadow-lg shadow-sky-200/35 dark:border-slate-700 dark:bg-slate-900/82 dark:shadow-slate-950/40'
          : 'border border-cyan-100/80 bg-white/80 shadow-lg shadow-cyan-100/40 dark:border-slate-700 dark:bg-slate-900/85 dark:shadow-slate-950/40'"
      >
        <!-- Logo -->
        <NuxtLink
          to="/"
          class="mr-6 inline-flex min-h-[40px] flex-shrink-0 items-center text-lg font-semibold tracking-tight transition-colors sm:mr-8 sm:min-h-[44px] sm:text-xl"
          :class="isHomeRoute
            ? 'text-sky-900 hover:text-sky-700 dark:text-sky-100 dark:hover:text-sky-200'
            : 'text-cyan-900 hover:text-cyan-700 dark:text-cyan-50 dark:hover:text-cyan-200'"
        >
          {{ $t('common.appName') }}
        </NuxtLink>

      <!-- Desktop Navigation -->
        <ul class="hidden xl:flex xl:items-center xl:gap-1.5">
          <li v-for="item in mainNavItems" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[0.925rem] font-medium text-slate-600 transition-all duration-200 dark:text-slate-300"
              :class="[
                isHomeRoute
                  ? 'hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-slate-800 dark:hover:text-sky-200'
                  : 'hover:bg-cyan-50 hover:text-cyan-700 dark:hover:bg-slate-800 dark:hover:text-cyan-200',
                isActive(item.to)
                  ? (isHomeRoute
                      ? 'bg-sky-600 text-white shadow-sm shadow-sky-700/30 hover:bg-sky-600 hover:text-white dark:bg-sky-700 dark:text-slate-100 dark:hover:bg-sky-600'
                      : 'bg-cyan-600 text-white shadow-sm shadow-cyan-700/30 hover:bg-cyan-600 hover:text-white dark:bg-cyan-700 dark:text-slate-100 dark:hover:bg-cyan-600')
                  : ''
              ]"
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
            class="cursor-pointer rounded-xl p-2 text-slate-500 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
            :class="isHomeRoute ? 'hover:bg-sky-50 hover:text-sky-700 dark:hover:text-sky-200' : 'hover:bg-cyan-50 hover:text-cyan-700 dark:hover:text-cyan-200'"
            :aria-label="$t('theme.toggleDarkMode')"
          >
            <Icon
              :name="themeToggleIcon"
              class="h-5 w-5"
            />
          </button>
        </li>

        <!-- Authenticated User -->
        <li v-if="isAuthenticated">
          <div class="relative z-40">
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
              class="absolute right-0 z-[80] mt-2 w-52 rounded-xl border border-cyan-100 bg-white/95 py-1 shadow-lg shadow-cyan-100/50 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95"
            >
              <NuxtLink
                to="/settings"
                class="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-cyan-50 dark:text-slate-200 dark:hover:bg-slate-700"
                @click="userMenuOpen = false"
              >
                <Icon name="heroicons:cog-6-tooth" class="h-4 w-4" />
                <span>{{ $t('nav.settings') }}</span>
              </NuxtLink>

              <!-- Admin Section -->
              <template v-if="user?.role === 'ADMIN'">
                <div class="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Admin
                </div>
                <NuxtLink
                  to="/admin"
                  class="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-cyan-50 dark:text-slate-200 dark:hover:bg-slate-700"
                  @click="userMenuOpen = false"
                >
                  <Icon name="heroicons:cog" class="h-4 w-4" />
                  <span>{{ $t('nav.admin') }}</span>
                </NuxtLink>
                <NuxtLink
                  to="/admin/blog"
                  class="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-cyan-50 dark:text-slate-200 dark:hover:bg-slate-700"
                  @click="userMenuOpen = false"
                >
                  <Icon name="heroicons:pencil" class="h-4 w-4" />
                  <span>{{ $t('nav.manageBlog') }}</span>
                </NuxtLink>
              </template>

              <div class="my-1 border-t border-slate-200 dark:border-slate-700"></div>

              <button
                @click="async () => { const { logout } = useAuth(); await logout(); userMenuOpen = false; }"
                class="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-700"
              >
                <Icon name="heroicons:arrow-left-on-rectangle" class="h-4 w-4" />
                <span>{{ $t('nav.logout') }}</span>
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
              class="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:text-slate-950 dark:focus:ring-offset-slate-900"
              :class="isHomeRoute
                ? 'bg-orange-500 shadow-orange-700/25 hover:bg-orange-400 focus:ring-orange-400 dark:bg-orange-600 dark:hover:bg-orange-500'
                : 'bg-emerald-600 shadow-emerald-700/30 hover:bg-emerald-700 focus:ring-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500'"
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
          class="flex cursor-pointer items-center rounded-xl border bg-white/80 p-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
          :class="isHomeRoute
            ? 'border-sky-100 text-sky-700 hover:bg-sky-50 dark:text-sky-200'
            : 'border-cyan-100 text-cyan-700 hover:bg-cyan-50 dark:text-cyan-200'"
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
      <div
        class="relative z-10 mt-2 hidden rounded-2xl px-4 py-2.5 backdrop-blur-xl xl:block xl:px-5 xl:py-3"
        :class="isHomeRoute
          ? 'border border-sky-200/65 bg-white/70 shadow-md shadow-sky-200/30 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-slate-950/40'
          : 'border border-cyan-100/70 bg-white/80 shadow-md shadow-cyan-100/30 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-slate-950/40'"
      >
        <div class="flex items-center gap-4">
          <ul v-if="featuredSecondaryItems.length > 0" class="flex items-center gap-1">
            <li v-for="item in featuredSecondaryItems" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 dark:text-slate-300 dark:hover:bg-slate-800"
                :class="[
                  isHomeRoute
                    ? 'hover:bg-sky-50 hover:text-sky-700 dark:hover:text-sky-200'
                    : 'hover:bg-cyan-50 hover:text-cyan-700 dark:hover:text-cyan-200',
                  isActive(item.to)
                    ? (isHomeRoute ? 'bg-sky-50 text-sky-700 dark:bg-slate-800 dark:text-sky-300' : 'bg-cyan-50 text-cyan-700 dark:bg-slate-800 dark:text-cyan-300')
                    : ''
                ]"
              >
                <Icon :name="getIconName(item.icon)" class="h-[18px] w-[18px]" width="18" height="18" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </li>
          </ul>

          <div v-if="featuredSecondaryItems.length > 0" class="hidden h-7 w-px bg-slate-200 dark:bg-slate-700 xl:block" />

          <div class="min-w-0 flex-1 overflow-hidden">
            <div class="flex items-center gap-2 overflow-x-auto pb-1">
              <p class="shrink-0 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {{ $t('nav.tools') }}
              </p>
              <ul class="flex items-center gap-1">
                <li v-for="item in toolSecondaryItems" :key="item.to">
                  <NuxtLink
                    :to="item.to"
                    class="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 dark:text-slate-300 dark:hover:bg-slate-800"
                    :class="[
                      isHomeRoute
                        ? 'hover:bg-sky-50 hover:text-sky-700 dark:hover:text-sky-200'
                        : 'hover:bg-cyan-50 hover:text-cyan-700 dark:hover:text-cyan-200',
                      isActive(item.to)
                        ? (isHomeRoute ? 'bg-sky-50 text-sky-700 dark:bg-slate-800 dark:text-sky-300' : 'bg-cyan-50 text-cyan-700 dark:bg-slate-800 dark:text-cyan-300')
                        : ''
                    ]"
                  >
                    <Icon :name="getIconName(item.icon)" class="h-[18px] w-[18px]" width="18" height="18" />
                    <span>{{ item.label }}</span>
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>

          <ul class="ml-auto flex items-center space-x-3">
            <li v-if="isAuthenticated">
              <NuxtLink
                to="/settings"
                class="rounded-lg p-2 text-slate-600 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
                :class="isHomeRoute ? 'hover:bg-sky-50 hover:text-sky-700 dark:hover:text-sky-200' : 'hover:bg-cyan-50 hover:text-cyan-700 dark:hover:text-cyan-200'"
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
          <NuxtLink
            to="/"
            class="text-xl font-semibold dark:text-cyan-50"
            :class="isHomeRoute ? 'text-sky-900 dark:text-sky-100' : 'text-cyan-900'"
            @click="mobileNavOpen = false"
          >
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
                class="flex items-center rounded-xl px-3 py-2.5 pr-4 text-sm text-slate-700 transition-colors duration-200 dark:text-slate-200 dark:hover:bg-slate-800"
                :class="[
                  isHomeRoute ? 'hover:bg-sky-100/80' : 'hover:bg-cyan-50',
                  isActive(item.to)
                    ? (isHomeRoute ? 'bg-sky-600 text-white dark:bg-sky-700 dark:text-slate-100' : 'bg-cyan-600 text-white dark:bg-cyan-700 dark:text-slate-100')
                    : ''
                ]"
                @click="mobileNavOpen = false"
              >
                <Icon :name="getIconName(item.icon)" class="mr-3 h-5 w-5" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </li>
          </ul>

          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {{ $t('nav.tools') }}
          </h3>
          <ul class="text-sm font-medium">
            <li v-for="item in secondaryNavItems" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="flex items-center rounded-xl px-3 py-2.5 pr-2 text-sm text-slate-700 transition-colors duration-200 dark:text-slate-200 dark:hover:bg-slate-800"
                :class="[
                  isHomeRoute ? 'hover:bg-sky-100/80' : 'hover:bg-cyan-50',
                  isActive(item.to)
                    ? (isHomeRoute ? 'bg-sky-600 text-white dark:bg-sky-700 dark:text-slate-100' : 'bg-cyan-600 text-white dark:bg-cyan-700 dark:text-slate-100')
                    : ''
                ]"
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
          <div class="border-t pt-8 dark:border-slate-700" :class="isHomeRoute ? 'border-sky-100' : 'border-cyan-100'">
            <!-- Language & Theme -->
            <div class="flex items-center justify-between mb-4">
              <LanguageSwitcher dropdown-position="left" />
              <button
                @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
                class="cursor-pointer rounded-lg p-2 text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
                :class="isHomeRoute ? 'hover:bg-sky-100/80 hover:text-sky-700 dark:hover:text-sky-200' : 'hover:bg-cyan-50 hover:text-cyan-700 dark:hover:text-cyan-200'"
                :aria-label="$t('theme.toggleDarkMode')"
              >
                <Icon
                  :name="themeToggleIcon"
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
                class="mt-2 flex items-center rounded-xl px-3 py-3 pr-2 text-slate-700 transition-colors dark:text-slate-200 dark:hover:bg-slate-800"
                :class="isHomeRoute ? 'hover:bg-sky-100/80' : 'hover:bg-cyan-50'"
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
                class="flex items-center rounded-xl px-3 py-3 pr-2 text-slate-700 transition-colors dark:text-slate-200 dark:hover:bg-slate-800"
                :class="isHomeRoute ? 'hover:bg-sky-100/80' : 'hover:bg-cyan-50'"
                @click="mobileNavOpen = false"
              >
                <Icon name="heroicons:arrow-left-on-rectangle" class="mr-3 h-5 w-5" />
                <span>{{ $t('auth.login') }}</span>
              </NuxtLink>
              <NuxtLink
                to="/auth/register"
                class="flex items-center rounded-xl px-3 py-3 pr-2 text-white transition-colors dark:text-slate-950"
                :class="isHomeRoute
                  ? 'bg-orange-500 hover:bg-orange-400 dark:bg-orange-600 dark:hover:bg-orange-500'
                  : 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500'"
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
