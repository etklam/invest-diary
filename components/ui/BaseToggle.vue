<script setup lang="ts">
interface Props {
  modelValue?: boolean
  disabled?: boolean
  label?: string
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const toggle = () => {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<template>
  <div class="flex items-center gap-3">
    <button
      :id="id"
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-fast ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
      :class="[
        modelValue ? 'bg-accent border-accent' : 'bg-surface border-line'
      ]"
      @click="toggle"
    >
      <span
        aria-hidden="true"
        class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-fast ease-in-out"
        :class="[
          modelValue ? 'translate-x-[22px]' : 'translate-x-0.5'
        ]"
      />
    </button>
    <label
      v-if="label"
      :for="id"
      class="text-sm font-medium text-copy-secondary cursor-pointer"
      @click="toggle"
    >
      {{ label }}
    </label>
  </div>
</template>
