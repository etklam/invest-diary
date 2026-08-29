<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { computed, resolveComponent } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    to?: RouteLocationRaw
  }>(),
  {
    variant: 'primary',
    type: 'button',
    disabled: false,
  }
)

const variantClass = computed(() => {
  return {
    primary:
      'border-dt-primary-solid bg-dt-primary-solid text-white hover:bg-dt-primary-solid-active hover:border-dt-primary-solid-active',
    secondary:
      'border-dt-border bg-dt-surface text-dt-text hover:bg-dt-surface-strong hover:border-dt-border-strong',
    ghost:
      'border-transparent bg-transparent text-dt-text-muted hover:bg-dt-surface-strong hover:text-dt-text',
    danger:
      'border-dt-danger bg-dt-danger text-white hover:opacity-90',
  }[props.variant]
})

const componentTag = computed(() => props.to ? resolveComponent('NuxtLink') : 'button')

const preventDisabledNavigation = (event: MouseEvent) => {
  if (props.to && props.disabled) event.preventDefault()
}
</script>

<template>
  <component
    :is="componentTag"
    :to="to"
    :type="to ? undefined : type"
    :disabled="to ? undefined : disabled"
    :aria-disabled="to && disabled ? 'true' : undefined"
    :tabindex="to && disabled ? -1 : undefined"
    class="inline-flex min-h-11 items-center justify-center gap-2 rounded-dt-sm border px-4 py-2 text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
    :class="variantClass"
    @click="preventDisabledNavigation"
  >
    <slot />
  </component>
</template>
