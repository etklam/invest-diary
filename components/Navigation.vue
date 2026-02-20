<script setup lang="ts">
const { t } = useI18n()
const colorMode = useColorMode()
const { isAuthenticated, user } = useAuth()
const { visibleNavItems, isActive } = useNavigation()

// Mobile menu state
const mobileNavOpen = ref(false)

// User dropdown state
const userMenuOpen = ref(false)

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
      { label: t('nav.about'), to: '/about', icon: 'information-circle' }
    ]
  }

  return [
    { label: t('nav.discipline'), to: '/discipline', icon: 'light-bulb' },
    { label: t('nav.alerts'), to: '/alerts', icon: 'bell' },
    ...(user.value?.role === 'ADMIN'
      ? [
          { label: t('nav.admin'), to: '/admin', icon: 'cog' },
          { label: t('nav.blog'), to: '/admin/blog', icon: 'document-text' }
        ]
      : [])
  ]
})

// Get heroicon name from simple key
const getIconName = (icon: string) => {
  return `heroicons:${icon}`
}
</script>

<template>
  <nav class="relative">
    <!-- Primary Navigation Bar -->
    <div class="p-6 flex items-center bg-gray-800 dark:bg-gray-900">
      <!-- Logo -->
      <NuxtLink to="/" class="flex-shrink-0 mr-12 text-2xl text-white font-semibold">
        {{ $t('common.appName') }}
      </NuxtLink>

      <!-- Desktop Navigation -->
      <ul class="hidden xl:flex">
        <li v-for="item in mainNavItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="flex mr-10 items-center text-gray-50 hover:text-gray-100 text-sm transition-colors"
            :class="isActive(item.to) ? 'text-white font-medium' : ''"
          >
            <Icon :name="getIconName(item.icon)" class="text-gray-500 w-5 h-5 mr-2" width="18" height="18" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </li>
      </ul>

      <!-- Desktop Right Side -->
      <ul class="hidden xl:flex lg:justify-end lg:items-center lg:space-x-6 mr-6 ml-auto">
        <!-- Language Switcher -->
        <li>
          <LanguageSwitcher />
        </li>

        <!-- Theme Toggle -->
        <li>
          <button
            @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
            class="text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
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
              class="flex items-center focus:outline-none"
            >
              <div class="mr-3 text-right">
                <p class="text-sm text-white">{{ user?.name || user?.email }}</p>
                <p class="text-sm text-gray-400">{{ user?.role === 'ADMIN' ? $t('nav.admin') : $t('nav.users') }}</p>
              </div>
              <div class="mr-2">
                <div class="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span class="text-white font-medium">
                    {{ (user?.name || user?.email)?.charAt(0).toUpperCase() }}
                  </span>
                </div>
              </div>
              <Icon
                name="heroicons:chevron-down"
                class="text-gray-400 w-3 h-3"
              />
            </button>

            <!-- User Dropdown Menu -->
            <div
              v-if="userMenuOpen"
              class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50"
            >
              <NuxtLink
                to="/settings"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="userMenuOpen = false"
              >
                {{ $t('nav.settings') }}
              </NuxtLink>
              <button
                @click="async () => { const { logout } = useAuth(); await logout(); userMenuOpen = false; }"
                class="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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
              class="text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
            >
              {{ $t('auth.login') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/auth/register"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
          class="flex items-center rounded focus:outline-none p-2"
          :aria-label="mobileNavOpen ? $t('theme.closeMenu') : $t('theme.openMenu')"
        >
          <Icon
            :name="mobileNavOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'"
            class="text-white bg-indigo-500 hover:bg-indigo-600 block h-8 w-8 p-2 rounded"
          />
        </button>
      </div>
    </div>

    <!-- Secondary Navigation Bar (Desktop) -->
    <div class="hidden xl:block py-5 px-6 bg-white dark:bg-gray-900 border-b dark:border-gray-700">
      <div class="flex items-center">
        <ul class="flex items-center">
          <li v-for="item in secondaryNavItems" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="flex mr-10 items-center text-sm text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              :class="isActive(item.to) ? '!text-indigo-600 dark:!text-indigo-400' : ''"
            >
              <Icon :name="getIconName(item.icon)" class="text-gray-100 w-5 h-5 mr-2" width="18" height="18" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>

        <!-- Quick Actions (right side) -->
        <ul class="ml-auto flex items-center space-x-4">
          <li v-if="isAuthenticated">
            <NuxtLink
              to="/settings"
              class="text-gray-200 hover:text-gray-300 dark:text-gray-600 dark:hover:text-gray-500 transition-colors"
            >
              <Icon name="heroicons:cog-6-tooth" class="w-5 h-5" width="18" height="18" />
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <!-- Mobile Navigation Drawer -->
    <div
      :class="{ 'block': mobileNavOpen, 'hidden': !mobileNavOpen }"
      class="fixed top-0 left-0 bottom-0 w-3/4 lg:w-80 sm:max-w-xs z-50"
    >
      <!-- Backdrop -->
      <div
        @click="mobileNavOpen = false"
        class="fixed inset-0 bg-gray-800 opacity-10"
      />

      <!-- Mobile Nav Content -->
      <nav class="relative flex flex-col pt-6 pb-8 h-full w-full bg-gray-800 dark:bg-gray-900 overflow-y-auto">
        <div class="flex w-full items-center px-6 pb-6 mb-6 lg:border-b border-gray-700">
          <NuxtLink to="/" class="text-xl text-white font-semibold" @click="mobileNavOpen = false">
            {{ $t('common.appName') }}
          </NuxtLink>
        </div>

        <div class="px-4 pb-6">
          <h3 class="mb-2 text-xs uppercase text-gray-500 font-medium">
            {{ $t('nav.home') }}
          </h3>
          <ul class="mb-8 text-sm font-medium">
            <li v-for="item in mainNavItems" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="flex items-center pl-3 py-3 pr-4 text-gray-50 hover:bg-gray-900 dark:hover:bg-gray-800 rounded transition-colors"
                :class="isActive(item.to) ? 'bg-indigo-500' : ''"
                @click="mobileNavOpen = false"
              >
                <Icon :name="getIconName(item.icon)" class="text-gray-500 w-5 h-5 mr-3" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </li>
          </ul>

          <h3 class="mb-2 text-xs uppercase text-gray-500 font-medium">
            {{ $t('common.search') }}
          </h3>
          <ul class="text-sm font-medium">
            <li v-for="item in secondaryNavItems" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="flex items-center pl-3 py-3 pr-2 text-gray-50 hover:bg-gray-900 dark:hover:bg-gray-800 rounded transition-colors"
                :class="isActive(item.to) ? 'bg-indigo-500' : ''"
                @click="mobileNavOpen = false"
              >
                <Icon :name="getIconName(item.icon)" class="text-gray-500 w-5 h-5 mr-3" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Mobile Auth Section -->
        <div class="px-4">
          <div class="pt-8 border-t border-gray-700">
            <!-- Language & Theme -->
            <div class="flex items-center justify-between mb-4">
              <LanguageSwitcher />
              <button
                @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
                class="p-2 rounded-lg text-gray-500 hover:bg-gray-700 dark:text-gray-400 transition-colors"
                :aria-label="$t('theme.toggleDarkMode')"
              >
                <Icon
                  :name="colorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon'"
                  class="h-5 w-5"
                />
              </button>
            </div>

            <template v-if="isAuthenticated">
              <div class="px-3 py-2 text-sm text-gray-400">
                {{ $t('auth.loggedInAs') }}
              </div>
              <div class="px-3 py-2 text-sm text-white">
                {{ user?.name || user?.email }}
              </div>
              <NuxtLink
                to="/settings"
                class="flex items-center pl-3 py-3 pr-2 text-gray-50 hover:bg-gray-900 dark:hover:bg-gray-800 rounded transition-colors mt-2"
                @click="mobileNavOpen = false"
              >
                <Icon name="heroicons:cog-6-tooth" class="text-gray-500 w-5 h-5 mr-3" />
                <span>{{ $t('nav.settings') }}</span>
              </NuxtLink>
              <button
                @click="async () => { const { logout } = useAuth(); mobileNavOpen = false; await logout(); }"
                class="flex items-center pl-3 py-3 pr-2 text-gray-50 hover:bg-gray-900 dark:hover:bg-gray-800 rounded transition-colors w-full"
              >
                <Icon name="heroicons:arrow-right-on-rectangle" class="text-gray-500 w-5 h-5 mr-3" />
                <span>{{ $t('nav.logout') }}</span>
              </button>
            </template>
            <template v-else>
              <NuxtLink
                to="/auth/login"
                class="flex items-center pl-3 py-3 pr-2 text-gray-50 hover:bg-gray-900 dark:hover:bg-gray-800 rounded transition-colors"
                @click="mobileNavOpen = false"
              >
                <Icon name="heroicons:arrow-left-on-rectangle" class="text-gray-500 w-5 h-5 mr-3" />
                <span>{{ $t('auth.login') }}</span>
              </NuxtLink>
              <NuxtLink
                to="/auth/register"
                class="flex items-center pl-3 py-3 pr-2 text-indigo-400 hover:bg-gray-900 dark:hover:bg-gray-800 rounded transition-colors"
                @click="mobileNavOpen = false"
              >
                <Icon name="heroicons:user-plus" class="text-gray-500 w-5 h-5 mr-3" />
                <span>{{ $t('auth.register') }}</span>
              </NuxtLink>
            </template>
          </div>
        </div>
      </nav>
    </div>
  </nav>
</template>
