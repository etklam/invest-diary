<script setup lang="ts">
const { user, logout } = useAuth()
const colorMode = useColorMode()

const isOpen = ref(false)

// Close dropdown when clicking outside
const closeDropdown = () => {
  isOpen.value = false
}

const handleLogout = async () => {
  isOpen.value = false
  await logout()
}

// Display name or email
const displayName = computed(() => {
  return user.value?.name || user.value?.email?.split('@')[0] || 'User'
})
</script>

<template>
  <div class="relative" v-if="user">
    <!-- User menu button -->
    <button
      @click="isOpen = !isOpen"
      class="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label="用戶選單"
    >
      <!-- User avatar icon -->
      <div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
        <Icon name="heroicons:user" class="h-5 w-5 text-white" />
      </div>
      <!-- User name (hidden on mobile) -->
      <span class="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200">
        {{ displayName }}
      </span>
      <!-- Dropdown arrow -->
      <Icon
        name="heroicons:chevron-down"
        class="h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Dropdown menu -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
        @click.outside="closeDropdown"
      >
        <!-- User info header -->
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">已登入為</p>
          <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
            {{ user.email }}
          </p>
        </div>

        <!-- Menu items -->
        <div class="py-1">
          <NuxtLink
            to="/diaries/new"
            @click="closeDropdown"
            class="group flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Icon name="heroicons:pencil-square" class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
            寫日記
          </NuxtLink>

          <NuxtLink
            to="/settings"
            @click="closeDropdown"
            class="group flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Icon name="heroicons:cog-6-tooth" class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
            設定
          </NuxtLink>

          <hr class="my-1 border-gray-200 dark:border-gray-700" />

          <button
            @click="handleLogout"
            class="group flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Icon name="heroicons:arrow-left-on-rectangle" class="mr-3 h-5 w-5" />
            登出
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
