<script setup lang="ts">
interface Tab {
  key: string
  label: string
  disabled?: boolean
}

interface Props {
  modelValue?: string
  tabs?: Tab[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  tabs: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeTab = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <div>
    <!-- Tab Headers -->
    <div class="flex items-center gap-1 border-b border-line" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.key"
        :aria-disabled="tab.disabled"
        :disabled="tab.disabled"
        class="px-1 py-2 text-sm font-medium transition-all duration-fast border-b-2 rounded-none"
        :class="[
          activeTab === tab.key
            ? 'text-copy border-accent'
            : 'text-copy-secondary border-transparent hover:text-copy'
        ]"
        @click="!tab.disabled && (activeTab = tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab Panels -->
    <div class="pt-4">
      <slot />
    </div>
  </div>
</template>
