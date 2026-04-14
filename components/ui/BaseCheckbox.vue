<script setup lang="ts">
let _idCounter = 0

interface Props {
  modelValue?: boolean | string[]
  value?: string | number
  disabled?: boolean
  label?: string
  id?: string
  indeterminate?: boolean
  name?: string
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  indeterminate: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean | string[]]
}>()

// 沒傳 id 就自動生一個，保證 label :for 能對上 input
const fallbackId = `checkbox-${++_idCounter}`
const resolvedId = computed(() => props.id ?? fallbackId)

const checkboxRef = ref<HTMLInputElement | null>(null)

// indeterminate 必須用 JS 設定，HTML attribute 無效
watchEffect(() => {
  if (checkboxRef.value) {
    checkboxRef.value.indeterminate = props.indeterminate ?? false
  }
})

const isChecked = computed(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue.includes(String(props.value))
  }
  return props.modelValue
})

const toggle = () => {
  if (props.disabled) return

  if (Array.isArray(props.modelValue)) {
    const value = String(props.value)
    if (isChecked.value) {
      emit('update:modelValue', props.modelValue.filter(v => v !== value))
    } else {
      emit('update:modelValue', [...props.modelValue, value])
    }
  } else {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-start gap-3">
      <div class="relative flex items-start pt-0.5">
        <input
          :id="resolvedId"
          ref="checkboxRef"
          type="checkbox"
          :name="name"
          :checked="isChecked"
          :disabled="disabled"
          class="peer h-4 w-4 appearance-none cursor-pointer border border-solid rounded-sm transition-all duration-fast ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
          :class="[
            isChecked || indeterminate
              ? 'bg-accent border-accent'
              : error
                ? 'bg-surface border-semantic-error hover:border-semantic-error'
                : 'bg-surface border-line hover:border-line-hover',
          ]"
          @change="toggle"
        />
        <Icon
          v-if="isChecked && !indeterminate"
          name="lucide:check"
          class="absolute left-0 top-0.5 h-4 w-4 text-copy-inverse pointer-events-none"
        />
        <Icon
          v-if="indeterminate"
          name="lucide:minus"
          class="absolute left-0 top-0.5 h-4 w-4 text-copy-inverse pointer-events-none"
        />
      </div>
      <label
        v-if="label"
        :for="resolvedId"
        class="text-sm font-medium text-copy-secondary cursor-pointer"
      >
        {{ label }}
      </label>
    </div>
    <p
      v-if="error"
      class="text-xs text-semantic-error ml-7"
    >
      {{ error }}
    </p>
  </div>
</template>
