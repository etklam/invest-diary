<template>
  <div class="min-h-screen bg-surface text-copy">
    <header class="mx-auto flex w-full max-w-content items-center justify-between px-4 pt-6 sm:px-8">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 border border-line bg-surface px-3 py-2 text-sm font-semibold text-copy transition-colors duration-fast hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <Icon name="lucide:arrow-left" class="h-4 w-4" />
        {{ $t('common.back') }}
      </NuxtLink>
      <LanguageSwitcher />
    </header>

    <main class="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-content items-start px-4 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8 lg:pt-10">
      <slot />
    </main>

    <Toast :toasts="toasts" @remove="removeToast" />
  </div>
</template>

<script setup lang="ts">
const { toasts, removeToast } = useToast()
</script>
