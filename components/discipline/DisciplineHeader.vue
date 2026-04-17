<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="text-center mb-16">
    <!-- Premium emblem -->
    <div class="inline-flex items-center justify-center w-20 h-20 mb-8 relative">
      <div class="absolute inset-0 bg-[#C9A962]/10 dark:bg-[#C9A962]/20 rounded-full blur-xl"></div>
      <div class="absolute inset-0 border border-[#C9A962]/20 dark:border-[#C9A962]/30 rounded-full"></div>
      <div class="relative w-16 h-16 bg-gradient-to-br from-[#C9A962] to-[#A68B4B] rounded-lg flex items-center justify-center shadow-lg">
        <svg class="w-8 h-8 text-white dark:text-[#0A1628]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
      </div>
    </div>

    <h1 class="text-4xl sm:text-5xl font-bold mb-4 tracking-tight" style="color: var(--color-text); font-family: var(--font-display);">
      {{ t('discipline.title') }}
    </h1>
    <div class="flex items-center justify-center gap-4 mb-6">
      <div class="h-px w-16 bg-gradient-to-r from-transparent to-[#C9A962]/50"></div>
      <div class="w-2 h-2 bg-[#C9A962] rotate-45 shadow-sm"></div>
      <div class="h-px w-16 bg-gradient-to-l from-transparent to-[#C9A962]/50"></div>
    </div>
    <p class="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-light" style="color: var(--color-text-muted);">
      {{ t('discipline.subtitle') }}
    </p>
  </div>
</template>
