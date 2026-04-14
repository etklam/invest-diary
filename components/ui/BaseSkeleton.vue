<script setup lang="ts">
interface Props {
  variant?: 'text' | 'circle' | 'card' | 'custom'
  width?: string
  height?: string
  count?: number
}

withDefaults(defineProps<Props>(), {
  variant: 'text',
  width: undefined,
  height: undefined,
  count: 1,
})

const variantClasses = {
  text: 'h-4 rounded-sm',
  circle: 'rounded-full',
  card: 'h-32 rounded-sm',
  custom: '',
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="n in count"
      :key="n"
      class="bg-surface-alt animate-pulse"
      :class="[variantClasses[variant]]"
      :style="{
        width: width || undefined,
        height: height || undefined,
      }"
    />
  </div>
</template>

