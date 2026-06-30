<template>
  <p class="mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]" style="border-color: color-mix(in srgb, var(--color-primary) 32%, transparent); background: var(--color-surface); color: var(--color-primary);">
    <Icon v-if="icon" :name="icon" class="h-4 w-4" style="color: var(--color-primary);" />
    <slot />
  </p>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string
}>()
</script>
