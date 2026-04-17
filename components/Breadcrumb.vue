<template>
  <nav v-if="items.length > 1" aria-label="Breadcrumb" class="mb-4">
    <ol class="flex flex-wrap items-center gap-1.5 text-sm" style="color: var(--color-text-soft);">
      <li v-for="(item, index) in items" :key="index" class="flex items-center gap-1.5">
        <Icon
          v-if="index > 0"
          name="heroicons:chevron-right-20-solid"
          class="h-3.5 w-3.5 flex-shrink-0"
          style="color: var(--color-text-soft);"
        />
        <NuxtLink
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="transition-colors hover:underline"
          style="color: var(--color-text-muted);"
        >
          {{ item.label }}
        </NuxtLink>
        <span
          v-else
          class="max-w-[200px] truncate font-medium"
          style="color: var(--color-text);"
          :title="item.label"
        >
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; to?: string }>
}>()
</script>
