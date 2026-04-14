<script setup lang="ts">
interface Props {
  clickable?: boolean
}

withDefaults(defineProps<Props>(), {
  clickable: false,
})
</script>

<template>
  <div
    class="border border-solid border-line bg-surface-alt p-6 transition-all duration-fast ease-in-out"
    :class="[
      clickable ? 'hover:border-line-hover hover:bg-surface-raised cursor-pointer' : '',
    ]"
  >
    <slot />
  </div>
</template>
