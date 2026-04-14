<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'

interface Props {
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  error?: string | boolean
  label?: string
  id?: string
  rows?: number
  name?: string
  maxlength?: number
  autoResize?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '',
  disabled: false,
  error: false,
  rows: 4,
  autoResize: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

const resize = () => {
  const el = textareaRef.value
  if (!el || !props.autoResize) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

const onInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
  if (props.autoResize) resize()
}

// Re-run resize whenever modelValue changes externally (e.g. programmatic set)
watch(
  () => props.modelValue,
  () => {
    if (props.autoResize) nextTick(resize)
  },
)

onMounted(() => {
  if (props.autoResize) resize()
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="id" class="text-sm font-medium text-copy-secondary">
      {{ label }}
    </label>
    <textarea
      ref="textareaRef"
      :id="id"
      :name="name"
      :value="modelValue"
      :rows="autoResize ? undefined : rows"
      :maxlength="maxlength"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full px-3 py-2.5 text-sm transition-all duration-fast ease-in-out border border-solid bg-surface text-copy placeholder:text-copy-muted rounded-none focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
      :class="[
        error ? 'border-semantic-error' : 'border-line',
        autoResize ? 'resize-none overflow-hidden' : 'resize-y',
      ]"
      @input="onInput"
    />
    <div v-if="maxlength" class="flex items-center justify-end">
      <span
        class="text-xs tabular-nums"
        :class="
          (modelValue?.length ?? 0) >= maxlength
            ? 'text-semantic-error'
            : 'text-copy-muted'
        "
      >
        {{ modelValue?.length ?? 0 }} / {{ maxlength }}
      </span>
    </div>
    <span v-if="error && typeof error === 'string'" class="text-xs text-semantic-error">
      {{ error }}
    </span>
  </div>
</template>
