<template>
  <div class="space-y-4">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white">
      {{ $t('blog.categories') }}
    </h3>
    <nav class="space-y-2">
      <NuxtLink
        v-for="cat in categories"
        :key="cat.key"
        :to="cat.key ? `/blog?category=${encodeURIComponent(cat.value)}` : '/blog'"
        class="flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors"
        :class="isActive(cat.key)
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'"
      >
        <span>{{ cat.label }}</span>
        <span v-if="cat.count !== undefined" class="text-xs opacity-70">
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

const isActive = (key: string) => {
  if (!key) return !route.query.category
  return route.query.category === key
}
</script>
