<script setup>
const { injectWebSiteSchema } = useStructuredData()
injectWebSiteSchema()

useHead({
  viewport: 'width=device-width, initial-scale=1',
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
      href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=Source+Sans+3:wght@400;500;600;700&display=swap'
    }
  ]
})
</script>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 160ms ease-out;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>

<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtLoadingIndicator />
    <NuxtPage />
  </NuxtLayout>
</template>
