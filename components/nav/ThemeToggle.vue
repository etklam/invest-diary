<script setup lang="ts">
const colorMode = useColorMode()
const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})

const themeToggleIcon = computed(() => {
  if (!isMounted.value) return 'lucide:moon'
  return colorMode.value === 'dark' ? 'lucide:sun' : 'lucide:moon'
})

const toggleTheme = () => {
  // Add transition class for smooth dark mode switch
  document.documentElement.classList.add('transition-colors')
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  // Remove after transition completes
  setTimeout(() => {
    document.documentElement.classList.remove('transition-colors')
  }, 300)
}
</script>

<template>
  <button
    @click="toggleTheme"
    class="cursor-pointer p-2 text-copy-muted hover:text-accent transition-colors duration-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    :aria-label="$t('theme.toggleDarkMode')"
  >
    <Icon
      :name="themeToggleIcon"
      class="h-5 w-5"
    />
  </button>
</template>
