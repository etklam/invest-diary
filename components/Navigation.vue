<script setup lang="ts">
const colorMode = useColorMode()
const { isAuthenticated, visibleNavItems, isActive } = useNavigation()

// Mobile menu state
const isMobileMenuOpen = ref(false)

// Close mobile menu when route changes
const route = useRoute()
watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})
</script>

<template>
  <nav class="bg-white shadow dark:bg-gray-800">
    <div class="container mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center">
            <NuxtLink to="/" class="text-xl font-bold text-gray-800 dark:text-white">
              投資日記
            </NuxtLink>
          </div>
          <!-- Desktop navigation -->
          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            <NuxtLink
              v-for="item in visibleNavItems"
              :key="item.to"
              :to="item.to"
              class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:border-gray-300"
              :class="isActive(item.to) ? '!border-indigo-500 text-gray-900 dark:text-white' : ''"
            >
              {{ item.label }}
            </NuxtLink>
          </div>
        </div>

        <!-- Desktop right side -->
        <div class="hidden sm:flex sm:items-center sm:space-x-4">
          <button
            @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
            class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="切換深色模式"
          >
            <Icon
              :name="colorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon'"
              class="h-5 w-5"
            />
          </button>

          <!-- Authenticated user menu -->
          <UserMenu v-if="isAuthenticated" />

          <!-- Guest auth buttons -->
          <template v-else>
            <NuxtLink
              to="/auth/login"
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors min-h-[44px]"
            >
              登入
            </NuxtLink>
            <NuxtLink
              to="/auth/register"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
            >
              註冊
            </NuxtLink>
          </template>
        </div>

        <!-- Mobile menu button -->
        <div class="flex items-center sm:hidden space-x-2">
          <button
            @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
            class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="切換深色模式"
          >
            <Icon
              :name="colorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon'"
              class="h-5 w-5"
            />
          </button>
          <button
            @click="isMobileMenuOpen = !isMobileMenuOpen"
            class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="開啟選單"
            :aria-expanded="isMobileMenuOpen"
          >
            <Icon
              :name="isMobileMenuOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'"
              class="h-6 w-6"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile menu -->
    <div
      v-show="isMobileMenuOpen"
      class="sm:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
    >
      <div class="px-2 pt-2 pb-3 space-y-1">
        <NuxtLink
          v-for="item in visibleNavItems"
          :key="item.to"
          :to="item.to"
          class="block px-3 py-3 rounded-md text-base font-medium min-h-[44px] flex items-center transition-colors"
          :class="isActive(item.to)
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'"
          @click="isMobileMenuOpen = false"
        >
          {{ item.label }}
        </NuxtLink>
      </div>

      <!-- Mobile auth section -->
      <div class="pt-4 pb-4 border-t border-gray-200 dark:border-gray-700 px-2">
        <template v-if="isAuthenticated">
          <div class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
            已登入
          </div>
          <NuxtLink
            to="/settings"
            class="block px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 min-h-[44px] flex items-center"
            @click="isMobileMenuOpen = false"
          >
            設定
          </NuxtLink>
          <button
            @click="async () => { const { logout } = useAuth(); isMobileMenuOpen = false; await logout(); }"
            class="block w-full text-left px-3 py-3 rounded-md text-base font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 min-h-[44px] flex items-center"
          >
            登出
          </button>
        </template>
        <template v-else>
          <NuxtLink
            to="/auth/login"
            class="block px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 min-h-[44px] flex items-center"
            @click="isMobileMenuOpen = false"
          >
            登入
          </NuxtLink>
          <NuxtLink
            to="/auth/register"
            class="block px-3 py-3 rounded-md text-base font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 min-h-[44px] flex items-center"
            @click="isMobileMenuOpen = false"
          >
            註冊
          </NuxtLink>
        </template>
      </div>
    </div>
  </nav>
</template>
