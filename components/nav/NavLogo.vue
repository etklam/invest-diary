<script setup lang="ts">
const { t } = useI18n()
const { homeRoute } = useNavigation()

defineProps<{
  isMobile?: boolean
}>()
</script>

<template>
  <NuxtLink
    :to="homeRoute"
    class="inline-flex min-h-[44px] flex-shrink-0 items-center transition-colors"
    :class="[
      isMobile ? 'text-xl font-semibold' : 'mr-6 text-lg font-semibold tracking-tight sm:mr-8 sm:text-xl'
    ]"
    style="color: var(--color-text); font-family: var(--font-display);"
  >
    {{ t('common.appName') }}
  </NuxtLink>
</template>
