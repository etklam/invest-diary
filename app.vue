<script setup>
useHead({
  viewport: 'width=device-width, initial-scale=1',
  meta: [
    { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
    { name: 'theme-color', content: '#0f172a', media: '(prefers-color-scheme: dark)' }
  ]
})
</script>

<template>
  <NuxtLayout>
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-accent focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
    >
      Skip to content
    </a>
    <NuxtRouteAnnouncer />
    <div id="main-content">
      <NuxtPage />
    </div>
  </NuxtLayout>
</template>

<style>
/* Page transitions — subtle slide + fade */
.page-enter-active,
.page-leave-active {
  transition: opacity 250ms ease, transform 250ms ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.page-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

/* Layout transitions — cross-fade only */
.layout-enter-active,
.layout-leave-active {
  transition: opacity 200ms ease;
}
.layout-enter-from,
.layout-leave-to {
  opacity: 0;
}

/* Dark mode seamless transition */
html.transition-colors,
html.transition-colors *,
html.transition-colors *::before,
html.transition-colors *::after {
  transition: background-color 250ms ease, color 250ms ease, border-color 250ms ease !important;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active,
  .layout-enter-active,
  .layout-leave-active {
    transition: none;
  }
}
</style>
