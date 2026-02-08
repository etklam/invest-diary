<script setup lang="ts">
const colorMode = useColorMode()
const { isAuthenticated, visibleNavItems, isActive } = useNavigation()
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
        <div class="flex items-center space-x-4">
          <button
            @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
            class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
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
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              登入
            </NuxtLink>
            <NuxtLink
              to="/auth/register"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              註冊
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>
