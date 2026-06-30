<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="text-center py-20">
    <div class="inline-flex items-center justify-center w-24 h-24 rounded-full mb-8 border" style="background: var(--color-surface-strong); border-color: var(--color-border);">
      <svg class="w-12 h-12" style="color: color-mix(in srgb, var(--color-primary) 50%, transparent);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
      </svg>
    </div>
    <h3 class="text-2xl font-semibold mb-3" style="color: var(--color-text); font-family: var(--font-display);">{{ t('discipline.emptyState.title') }}</h3>
    <p class="max-w-md mx-auto leading-relaxed" style="color: var(--color-text-muted);">
      {{ t('discipline.emptyState.description') }}
    </p>
  </div>
</template>
