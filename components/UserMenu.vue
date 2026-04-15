<script setup lang="ts">
const { t } = useI18n()
const { isAuthenticated, user, logout } = useAuth()
const { getTimezoneInfo } = useTimezone()

// User dropdown state
const userMenuOpen = ref(false)

// Get current timezone info
const currentTimezone = computed(() => {
  return getTimezoneInfo(user.value?.timezone)
})

const handleLogout = async () => {
  userMenuOpen.value = false
  await logout()
}

// Close when clicking outside
const menuRef = ref<HTMLElement | null>(null)
if (process.client) {
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
      userMenuOpen.value = false
    }
  }

  onMounted(() => {
    document.addEventListener('mousedown', handleClickOutside)
  })

  onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside)
  })
}
</script>

<template>
  <div v-if="isAuthenticated" class="relative z-40" ref="menuRef">
    <button
      @click="userMenuOpen = !userMenuOpen"
      class="flex cursor-pointer items-center rounded-xl border border-cyan-100/80 bg-white/70 py-1.5 pl-3 pr-2 transition-colors duration-200 hover:border-cyan-200 hover:bg-cyan-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
    >
      <div class="mr-3 text-right">
        <p class="max-w-[180px] truncate text-sm text-slate-900 dark:text-slate-100">{{ user?.name || user?.email }}</p>
        <p class="text-xs text-slate-500 dark:text-slate-300">{{ user?.role === 'ADMIN' ? t('nav.admin') : t('nav.users') }}</p>
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
    <transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
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
          <span>{{ t('nav.settings') }}</span>
        </NuxtLink>

        <!-- Admin Section -->
        <template v-if="user?.role === 'ADMIN'">
          <div class="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
            Admin
          </div>
          <NuxtLink
            to="/admin"
            class="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-cyan-50 dark:text-slate-200 dark:hover:bg-slate-700"
            @click="userMenuOpen = false"
          >
            <Icon name="heroicons:cog" class="h-4 w-4" />
            <span>{{ t('nav.admin') }}</span>
          </NuxtLink>
          <NuxtLink
            to="/admin/blog"
            class="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-cyan-50 dark:text-slate-200 dark:hover:bg-slate-700"
            @click="userMenuOpen = false"
          >
            <Icon name="heroicons:pencil" class="h-4 w-4" />
            <span>{{ t('nav.manageBlog') }}</span>
          </NuxtLink>
        </template>

        <div class="my-1 border-t border-slate-200 dark:border-slate-700"></div>

        <button
          @click="handleLogout"
          class="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-700"
        >
          <Icon name="heroicons:arrow-left-on-rectangle" class="h-4 w-4" />
          <span>{{ t('nav.logout') }}</span>
        </button>
      </div>
    </transition>
  </div>
</template>
