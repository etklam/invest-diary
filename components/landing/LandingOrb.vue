<template>
  <div
    class="orb absolute rounded-full pointer-events-none filter blur-[58px]"
    :class="[sizeClass, positionClass]"
    :style="colorStyles"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
interface Props {
  color?: 'cyan' | 'orange' | 'blue' | 'rose'
  size?: 'sm' | 'md' | 'lg'
  position?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: 'cyan',
  size: 'md',
  position: ''
})

const colorStyles = computed(() => {
  switch (props.color) {
    case 'cyan': return 'background: color-mix(in srgb, var(--color-primary) 30%, transparent);'
    case 'orange': return 'background: color-mix(in srgb, var(--color-secondary) 20%, transparent);'
    case 'blue': return 'background: color-mix(in srgb, var(--color-info) 25%, transparent);'
    case 'rose': return 'background: color-mix(in srgb, var(--color-danger) 20%, transparent);'
    default: return 'background: color-mix(in srgb, var(--color-primary) 30%, transparent);'
  }
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-40 h-40'
    case 'md': return 'w-60 h-60 sm:w-72 sm:h-72'
    case 'lg': return 'w-80 h-80 sm:w-96 sm:h-96'
    default: return 'w-60 h-60'
  }
})

const positionClass = computed(() => props.position)
</script>
