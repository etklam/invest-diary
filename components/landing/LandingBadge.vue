<template>
  <p class="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 backdrop-blur dark:border-sky-700/60 dark:bg-slate-900/80 dark:text-sky-200">
    <Icon v-if="icon" :name="icon" class="h-4 w-4 text-sky-600 dark:text-sky-300" />
    <slot />
  </p>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string
}>()
</script>
