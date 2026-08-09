<script setup lang="ts">
import { computed } from 'vue'

const { t } = useI18n()
const route = useRoute()

const modes = computed(() => [
  { id: 'mine', label: t('timeline.myTimeline'), to: '/timeline', icon: 'heroicons:user' },
  { id: 'pair', label: t('timeline.pairView'), to: '/timeline/compare', icon: 'heroicons:rectangle-group' },
])

const isActive = (to: string) => to === '/timeline'
  ? route.path === '/timeline'
  : route.path === to || route.path.startsWith(`${to}/`)
</script>

<template>
  <nav
    class="inline-flex min-h-11 max-w-full items-center rounded-dt-sm border border-dt-border bg-dt-surface p-1"
    :aria-label="t('timeline.viewMode')"
  >
    <NuxtLink
      v-for="mode in modes"
      :key="mode.id"
      :to="mode.to"
      class="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-dt-sm px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30"
      :class="isActive(mode.to) ? 'bg-dt-primary text-white' : 'text-dt-text-muted hover:bg-dt-surface-strong hover:text-dt-text'"
      :aria-current="isActive(mode.to) ? 'page' : undefined"
    >
      <Icon :name="mode.icon" class="h-4 w-4 shrink-0" />
      <span class="truncate">{{ mode.label }}</span>
    </NuxtLink>
  </nav>
</template>
