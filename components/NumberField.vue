<template>
  <label class="grid gap-1 text-sm">
    <span class="font-semibold text-dt-text">{{ label }}</span>
    <input
      :value="modelValue"
      type="number"
      min="0"
      :step="step"
      class="rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-2 text-dt-text focus:border-dt-primary focus:outline-none"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string
  label: string
  step?: string
}>(), {
  step: '0.000001',
})

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
