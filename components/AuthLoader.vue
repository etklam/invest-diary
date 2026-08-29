<template>
  <div class="min-h-screen flex items-center justify-center bg-dt-bg" role="status" aria-live="polite">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-dt-primary mb-4" aria-hidden="true"></div>
      <p class="text-dt-text-muted">{{ $t('common.loading') || '載入中...' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// This component is displayed during authentication initialization
</script>