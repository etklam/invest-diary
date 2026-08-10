<template>
  <div class="space-y-1.5">
    <label :for="inputId" class="block text-sm font-semibold text-dt-text">
      {{ label || t('companyContext.label') }}
    </label>
    <input
      :id="inputId"
      :value="displayValue"
      type="text"
      autocomplete="off"
      class="min-h-11 w-full rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 text-sm text-dt-text outline-none focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20"
      :placeholder="t('companyContext.placeholder')"
      :aria-describedby="`${inputId}-hint`"
      @input="onInput"
      @blur="normalizeDisplay"
    />
    <p :id="`${inputId}-hint`" class="text-xs text-dt-text-soft">
      {{ t('companyContext.hint', { max: maxSymbols }) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string[]
  label?: string
  inputId?: string
  maxSymbols?: number
}>(), {
  label: '',
  inputId: 'company-symbols',
  maxSymbols: 10,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string[]): void
}>()

const { t } = useI18n()
const displayValue = ref(props.modelValue.join(', '))

watch(() => props.modelValue, (value) => {
  if (value.join(', ') !== displayValue.value) displayValue.value = value.join(', ')
})

function parse(value: string): string[] {
  return [...new Set(value
    .split(',')
    .map(symbol => symbol.trim().toUpperCase())
    .filter(Boolean))]
    .slice(0, props.maxSymbols)
}

function onInput(event: Event) {
  displayValue.value = (event.target as HTMLInputElement).value
  emit('update:modelValue', parse(displayValue.value))
}

function normalizeDisplay() {
  displayValue.value = parse(displayValue.value).join(', ')
}
</script>
