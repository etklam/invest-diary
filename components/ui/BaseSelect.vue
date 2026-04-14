<script setup lang="ts">
interface Props {
  modelValue?: string | number
  options?: Array<{ label: string; value: string | number }>
  disabled?: boolean
  error?: string | boolean
  label?: string
  id?: string
  placeholder?: string
  name?: string
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  options: () => [],
  disabled: false,
  error: false,
  placeholder: '',
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const onChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="id" class="text-sm font-medium text-copy-secondary">
      {{ label }}
    </label>
    <div class="relative">
      <select
        :id="id"
        :name="name"
        :value="modelValue"
        :disabled="disabled || loading"
        class="w-full px-3 py-2.5 text-sm transition-all duration-fast ease-in-out border border-solid bg-surface text-copy appearance-none rounded-none focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        :class="[
          error ? 'border-semantic-error' : 'border-line',
        ]"
        @change="onChange"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <!-- Chevron icon; dims while loading (spinner is banned per design spec) -->
      <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <Icon
          name="lucide:chevron-down"
          class="h-4 w-4 text-copy-muted transition-opacity duration-fast"
          :class="loading ? 'opacity-30' : 'opacity-100'"
        />
      </div>
    </div>
    <span v-if="error && typeof error === 'string'" class="text-xs text-semantic-error">
      {{ error }}
    </span>
  </div>
</template>
