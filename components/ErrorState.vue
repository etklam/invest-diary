<template>
  <div
    class="flex flex-col items-center justify-center rounded-2xl border px-6 py-12 text-center"
    style="border-color: var(--color-border); background: var(--color-surface);"
    role="alert"
  >
    <div
      class="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
      style="background: color-mix(in srgb, var(--color-danger) 10%, transparent);"
    >
      <Icon :name="icon" class="h-7 w-7" style="color: var(--color-danger);" />
    </div>
    <h3 class="text-lg font-semibold" style="color: var(--color-text);">
      {{ title || $t('error.somethingWrong') }}
    </h3>
    <p v-if="message" class="mt-2 max-w-md text-sm" style="color: var(--color-text-muted);">
      {{ message }}
    </p>
    <button
      v-if="retryFn"
      @click="retryFn"
      class="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all"
      style="background: var(--color-primary); color: var(--color-on-ink);"
    >
      <Icon name="heroicons:arrow-path" class="h-4 w-4" />
      {{ $t('common.retry') }}
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  message?: string
  icon?: string
  retryFn?: () => void
}>(), {
  icon: 'heroicons:exclamation-triangle'
})
</script>
