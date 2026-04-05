<template>
  <div class="auth-shell relative min-h-screen overflow-hidden text-slate-900 dark:text-slate-100">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -top-28 left-[-3rem] h-72 w-72 rounded-full bg-[color:color-mix(in_srgb,var(--color-secondary)_18%,transparent)] blur-3xl" />
      <div class="absolute bottom-[-5rem] right-[-3rem] h-96 w-96 rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_16%,transparent)] blur-3xl" />
    </div>

    <header class="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm backdrop-blur transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-primary);"
      >
        <Icon name="heroicons:arrow-left" class="h-4 w-4" />
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
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--color-secondary) 14%, transparent), transparent 35%),
    radial-gradient(circle at right 20% top 15%, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 30%),
    var(--color-background);
}
</style>
