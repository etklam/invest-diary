<template>
  <div
    class="orb absolute rounded-full pointer-events-none filter blur-[58px]"
    :class="[colorClass, sizeClass, positionClass]"
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

const colorClass = computed(() => {
  switch (props.color) {
    case 'cyan': return 'bg-sky-400/30 dark:bg-sky-400/10'
    case 'orange': return 'bg-orange-400/20 dark:bg-orange-400/5'
    case 'blue': return 'bg-blue-400/25 dark:bg-blue-400/10'
    case 'rose': return 'bg-rose-400/20 dark:bg-rose-400/5'
    default: return 'bg-sky-400/30'
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
