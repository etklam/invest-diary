<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
      {{ $t('blog.categories') }}
    </h3>
    <nav class="space-y-2">
      <NuxtLink
        v-for="cat in categories"
        :key="cat.key"
        :to="cat.key ? `/blog?category=${encodeURIComponent(cat.value)}` : '/blog'"
        class="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border"
        :class="isActive(cat.key, cat.value)
          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40 shadow-sm'
          : 'text-gray-700 hover:bg-gray-50 border-transparent hover:border-gray-200 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:border-gray-700 dark:hover:text-gray-300'"
      >
        <span>{{ cat.label }}</span>
        <span v-if="cat.count !== undefined" class="text-xs opacity-60 dark:opacity-70 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-full">
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
