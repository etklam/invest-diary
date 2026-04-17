<script setup lang="ts">
const { bottomNavItems, isActive } = useNavigation()

const navigationItems = computed(() => bottomNavItems.value)

const getIconName = (icon: string) => `heroicons:${icon}`

// Check safe area
const hasSafeArea = ref(false)
onMounted(() => {
  if (typeof window !== 'undefined') {
    const rootStyle = getComputedStyle(document.documentElement)
    const bottom = rootStyle.getPropertyValue('--safe-area-inset-bottom')
    if (bottom) {
      const value = parseInt(bottom, 10)
      hasSafeArea.value = !isNaN(value) && value > 0
    } else {
      hasSafeArea.value = false
    }
  }
})

// Explicitly typed computed for template class binding
const showSafeAreaPadding = computed(() => Boolean(hasSafeArea.value))
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl" :class="{ 'pb-safe': showSafeAreaPadding }" style="border-color: var(--color-border); background: color-mix(in srgb, var(--color-surface) 95%, transparent);">
    <div class="mx-auto flex h-16 max-w-md items-center justify-around px-2">
      <NuxtLink
        v-for="item in navigationItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-200"
        :style="isActive(item.to) ? 'color: var(--color-primary);' : 'color: var(--color-text-soft);'"
      >
        <div class="relative">
          <Icon :name="getIconName(item.icon)" class="h-6 w-6" />
        </div>
        <span class="text-[10px] font-medium">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
