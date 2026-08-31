<script setup lang="ts">
type PageContainerWidth = 'app' | 'wide' | 'reading'

withDefaults(defineProps<{
  width?: PageContainerWidth
}>(), {
  width: 'app',
})
</script>

<template>
  <div
    class="page-container"
    :class="`page-container--${width}`"
    data-page-container
    :data-page-container-width="width"
  >
    <slot />
  </div>
</template>

<style scoped>
.page-container {
  --page-container-max-width: 75rem;
  width: 100%;
  max-width: var(--page-container-max-width);
  margin-inline: auto;
  padding-inline: 1rem;
}

.page-container--wide {
  --page-container-max-width: 80rem;
}

.page-container--reading {
  --page-container-max-width: 50rem;
}

@media (min-width: 48rem) {
  .page-container {
    padding-inline: 1.5rem;
  }
}

@media (min-width: 64rem) {
  .page-container {
    padding-inline: 2rem;
  }
}
</style>
