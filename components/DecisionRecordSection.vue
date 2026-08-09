<script setup lang="ts">
defineProps<{
  headingId: string
  step: string
  title: string
  description: string
}>()
</script>

<template>
  <section :aria-labelledby="headingId" class="p-5 sm:p-7">
    <header class="flex items-start gap-4">
      <span aria-hidden="true" class="font-data mt-0.5 text-xs font-bold tracking-[0.16em] text-dt-secondary">
        {{ step }}
      </span>
      <div class="min-w-0">
        <h2 :id="headingId" class="font-display text-xl font-semibold tracking-tight text-dt-text sm:text-2xl">
          {{ title }}
        </h2>
        <p class="mt-1 text-sm leading-relaxed text-dt-text-muted">
          {{ description }}
        </p>
      </div>
    </header>
    <div class="mt-5">
      <slot />
    </div>
  </section>
</template>
