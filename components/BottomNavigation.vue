<script setup lang="ts">
const { bottomNavItems, isActive } = useNavigation()

const navigationItems = computed(() => bottomNavItems.value)

const getIconName = (icon: string) => `heroicons:${icon}`

</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 border-t pb-safe backdrop-blur-xl" style="border-color: var(--color-border); background: color-mix(in srgb, var(--color-surface) 95%, transparent);">
    <div class="mx-auto flex h-16 max-w-md items-center justify-around px-2">
      <NuxtLink
        v-for="item in navigationItems"
        :key="item.to"
        :to="item.to"
        class="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 transition-colors duration-200"
        :style="isActive(item.to) ? 'color: var(--color-primary);' : 'color: var(--color-text-soft);'"
        :aria-current="isActive(item.to) ? 'page' : undefined"
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
