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
  <nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95" :class="{ 'pb-safe': showSafeAreaPadding }">
    <div class="mx-auto flex h-16 max-w-md items-center justify-around px-2">
      <NuxtLink
        v-for="item in navigationItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-200"
        :class="isActive(item.to) ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
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
