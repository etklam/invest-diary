<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const isHomeRoute = computed(() => route.path === '/')

defineProps<{
  isMobile?: boolean
}>()
</script>

<template>
  <NuxtLink
    to="/"
    class="inline-flex flex-shrink-0 items-center transition-colors"
    :class="[
      isMobile ? 'text-xl font-semibold' : 'mr-6 min-h-[40px] text-lg font-semibold tracking-tight sm:mr-8 sm:min-h-[44px] sm:text-xl'
    ]"
    style="color: var(--color-text); font-family: var(--font-display);"
  >
    {{ t('common.appName') }}
  </NuxtLink>
</template>
