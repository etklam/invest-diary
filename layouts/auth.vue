<template>
  <div class="relative min-h-screen overflow-hidden bg-[#f0fdfa] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl dark:bg-teal-500/20" />
      <div class="absolute -bottom-24 -right-12 h-80 w-80 rounded-full bg-orange-300/30 blur-3xl dark:bg-orange-500/15" />
    </div>

    <header class="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 pt-4 sm:px-6 lg:px-8">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 rounded-xl border border-teal-200/80 bg-white/70 px-3 py-2 text-sm font-semibold text-teal-800 shadow-sm backdrop-blur transition-colors duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-teal-900 dark:bg-slate-900/80 dark:text-teal-200"
      >
        <Icon name="heroicons:arrow-left" class="h-4 w-4" />
        {{ $t('common.back') }}
      </NuxtLink>
      <LanguageSwitcher />
    </header>

    <main class="relative z-10 mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
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
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
    }
  ]
})
</script>
