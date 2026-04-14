<script setup lang="ts">
const { bottomNavItems, isActive } = useNavigation()

const getIconName = (icon: string) => {
  const iconMap: Record<string, string> = {
    'home': 'lucide:home',
    'chart-bar': 'lucide:bar-chart-2',
    'document-text': 'lucide:file-text',
    'bell': 'lucide:bell',
    'cog-6-tooth': 'lucide:settings'
  }
  return iconMap[icon] || `lucide:${icon}`
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-sticky border-t border-line bg-surface/90 backdrop-blur-md pb-safe">
    <div class="mx-auto flex h-16 max-w-content items-center justify-around px-2">
      <NuxtLink
        v-for="item in bottomNavItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-1 flex-col items-center justify-center gap-1 transition-all duration-fast"
        :class="isActive(item.to) ? 'text-accent' : 'text-copy-muted hover:text-copy'"
      >
        <div class="relative">
          <Icon :name="getIconName(item.icon)" class="h-6 w-6" />
        </div>
        <span class="text-[10px] font-medium tracking-tight uppercase">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
