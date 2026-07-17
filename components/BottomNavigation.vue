<script setup lang="ts">
const { bottomNavItems, isActive } = useNavigation()

const navigationItems = computed(() => bottomNavItems.value)

const getIconName = (icon: string) => `heroicons:${icon}`

</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-dt-border bg-dt-surface pb-safe shadow-[0_-1px_0_rgba(15,23,42,0.04)]">
    <div class="mx-auto flex h-16 max-w-md items-center justify-around px-2">
      <NuxtLink
        v-for="item in navigationItems"
        :key="item.id || `${item.icon}-${item.to}`"
        :to="item.to"
        class="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 transition-colors duration-150"
        :class="isActive(item.to) ? 'text-dt-primary' : 'text-dt-text-soft hover:text-dt-text-muted'"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <div class="relative">
          <Icon :name="getIconName(item.icon)" class="h-6 w-6" />
        </div>
        <span class="text-[10px] font-semibold tracking-wide">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
