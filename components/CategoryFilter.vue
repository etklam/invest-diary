<template>
  <div class="space-y-4">
    <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
      {{ $t('blog.categoriesLabel') }}
    </h3>
    <nav class="space-y-2">
      <NuxtLink
        v-for="cat in categories"
        :key="cat.key"
        :to="cat.key ? `/blog?category=${encodeURIComponent(cat.value)}` : '/blog'"
        class="category-item flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200"
        :class="isActive(cat.key, cat.value)
          ? 'category-item-active'
          : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'"
      >
        <span>{{ cat.label }}</span>
        <span v-if="cat.count !== undefined" class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
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

defineProps<{
  categories: Category[]
}>()

const isActive = (key: string, value: string) => {
  if (!key) return !route.query.category
  return route.query.category === value
}
</script>

<style scoped>
.category-item {
  border-color: rgb(186 230 253 / 62%);
  background: rgb(255 255 255 / 72%);
}

.category-item:hover {
  border-color: rgb(125 211 252 / 75%);
  background: rgb(240 249 255 / 95%);
}

.category-item-active {
  border-color: rgb(14 165 233 / 45%);
  color: rgb(3 105 161);
  background: rgb(224 242 254 / 90%);
  box-shadow: 0 10px 22px rgb(14 165 233 / 12%);
}

:global(.dark .category-item),
:global(.dark-mode .category-item) {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42 / 84%);
}

:global(.dark .category-item:hover),
:global(.dark-mode .category-item:hover) {
  border-color: rgb(56 189 248 / 70%);
  background: rgb(30 41 59);
}

:global(.dark .category-item-active),
:global(.dark-mode .category-item-active) {
  border-color: rgb(56 189 248 / 60%);
  color: rgb(186 230 253);
  background: rgb(12 74 110 / 35%);
}
</style>
