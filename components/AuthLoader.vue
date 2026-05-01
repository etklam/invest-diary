<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900" role="status" aria-live="polite">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4" aria-hidden="true"></div>
      <p class="text-gray-600 dark:text-gray-400">{{ $t('common.loading') || '載入中...' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// This component is displayed during authentication initialization
</script>