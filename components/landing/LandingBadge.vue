<template>
  <p class="mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur" style="border-color: color-mix(in srgb, var(--color-secondary) 32%, transparent); background: color-mix(in srgb, var(--color-surface-strong) 72%, transparent); color: var(--color-secondary);">
    <Icon v-if="icon" :name="icon" class="h-4 w-4" style="color: var(--color-secondary);" />
    <slot />
  </p>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string
}>()
</script>
