<template>
  <div class="animate-pulse rounded-2xl border p-5" style="border-color: var(--color-border); background: var(--color-surface);">
    <!-- Image placeholder -->
    <div v-if="showImage" class="mb-4 h-40 w-full rounded-xl" style="background: var(--color-surface-muted);" />
    <!-- Title placeholder -->
    <div class="h-5 w-3/4 rounded" style="background: var(--color-surface-muted);" />
    <!-- Subtitle placeholder -->
    <div class="mt-3 h-4 w-full rounded" style="background: var(--color-surface-strong);" />
    <div class="mt-2 h-4 w-5/6 rounded" style="background: var(--color-surface-strong);" />
    <!-- Meta placeholder -->
    <div v-if="showMeta" class="mt-4 flex items-center gap-3">
      <div class="h-3 w-16 rounded" style="background: var(--color-surface-muted);" />
      <div class="h-3 w-20 rounded" style="background: var(--color-surface-muted);" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  showImage?: boolean
  showMeta?: boolean
}>(), {
  showImage: true,
  showMeta: true,
})
</script>
