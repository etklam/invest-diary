<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="text-center py-20">
    <div class="inline-flex items-center justify-center w-24 h-24 bg-slate-100 dark:bg-[#1A1F2C] rounded-full mb-8 border border-[#C9A962]/10 dark:border-[#C9A962]/20">
      <svg class="w-12 h-12 text-[#C9A962]/30 dark:text-[#C9A962]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
      </svg>
    </div>
    <h3 class="text-2xl font-semibold text-slate-900 dark:text-[#F5F1E8] mb-3" style="font-family: 'Playfair Display', serif;">{{ t('discipline.emptyState.title') }}</h3>
    <p class="text-slate-600 dark:text-[#B8B4AE] max-w-md mx-auto leading-relaxed">
      {{ t('discipline.emptyState.description') }}
    </p>
  </div>
</template>
