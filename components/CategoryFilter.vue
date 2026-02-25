<template>
  <div class="space-y-4">
    <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
      {{ $t('blog.categoriesLabel') }}
    </h3>
    <nav class="space-y-2">
      <NuxtLink
        v-for="cat in categories"
        :key="cat.key"
        :to="cat.key ? `/blog?category=${encodeURIComponent(cat.value)}` : '/blog'"
        class="flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors duration-200"
        :class="isActive(cat.key, cat.value)
          ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-300'
          : 'border-transparent text-zinc-700 hover:border-zinc-200 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-300'"
      >
        <span>{{ cat.label }}</span>
        <span v-if="cat.count !== undefined" class="rounded-full bg-zinc-100 px-2 py-0.5 text-xs opacity-70 dark:bg-zinc-700/50 dark:opacity-80">
          {{ cat.count }}
        </span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

interface Category {
  key: string
  value: string
  label: string
  count?: number
}

const props = defineProps<{
  categories: Category[]
}>()

const isActive = (key: string, value: string) => {
  if (!key) return !route.query.category
  return route.query.category === value
}
</script>
