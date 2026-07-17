<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-sm sm:p-6">
    <header
      v-if="title || description"
      class="mb-4 border-b border-dt-border pb-3"
    >
      <h2
        v-if="title"
        class="font-display text-xl font-semibold tracking-tight text-dt-text"
      >
        {{ title }}
      </h2>
      <p
        v-if="description"
        class="mt-1 text-sm leading-relaxed text-dt-text-muted"
      >
        {{ description }}
      </p>
    </header>
    <slot />
  </section>
</template>
