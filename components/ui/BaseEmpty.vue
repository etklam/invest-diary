<script setup lang="ts">
interface Props {
  icon?: string
  title?: string
  description?: string
}

withDefaults(defineProps<Props>(), {
  icon: 'lucide:inbox',
  title: '',
  description: '',
})
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center py-16 px-4">
    <div class="min-h-[20vh] flex items-center justify-center">
      <Icon :name="icon" class="h-16 w-16 text-copy-muted" />
    </div>

    <h3 v-if="title" class="text-lg font-semibold text-copy mb-2">
      {{ title }}
    </h3>

    <p v-if="description" class="text-copy-secondary max-w-md">
      {{ description }}
    </p>

    <div v-if="$slots.action" class="mt-6">
      <slot name="action" />
    </div>
  </div>
</template>
