<script setup lang="ts">
const colorMode = useColorMode()
const isMounted = ref(false)
const route = useRoute()
const isHomeRoute = computed(() => route.path === '/')

onMounted(() => {
  isMounted.value = true
})

const themeToggleIcon = computed(() => {
  if (!isMounted.value) return 'heroicons:moon'
  return colorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon'
})
</script>

<template>
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
</template>
