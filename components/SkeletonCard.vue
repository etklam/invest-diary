<!--
  @deprecated 請改用 <AppSkeleton variant="card" /> 作為統一的骨架屏元件
  此元件保留作為向後相容的 thin wrapper
-->
<template>
  <AppSkeleton
    variant="card"
    :count="1"
    :show-image="showImage"
    :show-meta="showMeta"
  />
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  showImage?: boolean
  showMeta?: boolean
}>(), {
  showImage: true,
  showMeta: true,
})
</script>
