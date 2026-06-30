<template>
  <div class="auth-shell relative min-h-screen text-dt-text">
    <header class="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 rounded-dt-sm border border-dt-border bg-dt-surface px-3 py-2 text-sm font-semibold shadow-dt-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-dt-primary"
      >
        <Icon name="heroicons:arrow-left" class="h-4 w-4 text-dt-primary" />
        {{ $t('common.back') }}
      </NuxtLink>
      <LanguageSwitcher />
    </header>

    <main class="relative z-10 mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-7xl items-start px-4 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:px-8 lg:pt-10">
      <slot />
    </main>

    <Toast :toasts="toasts" @remove="removeToast" />
  </div>
</template>

<script setup lang="ts">
const { toasts, removeToast } = useToast()

useHead({
  link: [
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com'
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: ''
    }
  ]
})
</script>

<style scoped>
.auth-shell {
  background: var(--color-background);
}
</style>
