<script setup lang="ts">
interface Props {
  modelValue?: string | number
  type?: string
  placeholder?: string
  disabled?: boolean
  error?: string | boolean
  label?: string
  id?: string
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  disabled: false,
  error: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="id" class="text-sm font-medium text-copy-secondary">
      {{ label }}
    </label>
    <div class="relative">
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full px-3 py-2.5 text-sm transition-all duration-fast ease-in-out border border-solid bg-surface text-copy placeholder:text-copy-muted rounded-none focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
        :class="[
          error ? 'border-semantic-error' : 'border-line',
        ]"
        @input="onInput"
      />
    </div>
    <span v-if="error && typeof error === 'string'" class="text-xs text-semantic-error">
      {{ error }}
    </span>
  </div>
</template>
