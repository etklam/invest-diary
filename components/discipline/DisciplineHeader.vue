<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="text-center mb-16">
    <!-- Emblem -->
    <div class="inline-flex items-center justify-center w-16 h-16 mb-8 rounded-lg" style="background: color-mix(in srgb, var(--color-primary) 14%, transparent); color: var(--color-primary);">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
      </svg>
    </div>

    <h1 class="text-4xl sm:text-5xl font-bold mb-4 tracking-tight" style="color: var(--color-text); font-family: var(--font-display);">
      {{ t('discipline.title') }}
    </h1>
    <div class="flex items-center justify-center gap-4 mb-6">
      <div class="h-px w-16" style="background: color-mix(in srgb, var(--color-primary) 40%, transparent);"></div>
      <div class="w-2 h-2 rotate-45" style="background: var(--color-primary);"></div>
      <div class="h-px w-16" style="background: color-mix(in srgb, var(--color-primary) 40%, transparent);"></div>
    </div>
    <p class="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-light" style="color: var(--color-text-muted);">
      {{ t('discipline.subtitle') }}
    </p>
  </div>
</template>
