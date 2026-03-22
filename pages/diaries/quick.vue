<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <header class="bg-white dark:bg-gray-800 shadow">
      <div class="mx-auto max-w-3xl px-4 py-4">
        <h1 class="text-lg font-semibold">快速日記</h1>
      </div>
    </header>

    <main class="mx-auto max-w-3xl px-4 py-6">
      <QuickDiaryOneLiner />
    </main>
  </div>
</template>

<script setup lang="ts">
import QuickDiaryOneLiner from '~/components/QuickDiaryOneLiner.vue'

definePageMeta({
  middleware: 'auth'
})
</script>
