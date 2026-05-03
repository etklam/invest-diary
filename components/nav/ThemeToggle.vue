<script setup lang="ts">
const colorMode = useColorMode()
const isMounted = ref(false)

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
    class="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl p-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    style="color: var(--color-text-muted);"
    :style="{ '--tw-ring-color': 'var(--color-secondary)' }"
    :aria-label="$t('theme.toggleDarkMode')"
  >
    <Icon
      :name="themeToggleIcon"
      class="h-5 w-5"
    />
  </button>
</template>
