<template>
  <div class="category-filter">
    <nav class="flex flex-col gap-1.5">
      <NuxtLink
        v-for="cat in categories"
        :key="cat.key"
        :to="buildCategoryLink(cat)"
        class="group flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300"
        :class="isActive(cat.key, cat.value)
          ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'"
      >
        <div class="flex items-center gap-3">
          <div
            class="h-1.5 w-1.5 rounded-full transition-all duration-300"
            :class="isActive(cat.key, cat.value) ? 'scale-100 bg-sky-500' : 'scale-0 bg-slate-300 group-hover:scale-100 dark:bg-slate-600'"
          />
          <span>{{ cat.label }}</span>
        </div>
        <span
          v-if="cat.count !== undefined"
          class="rounded-lg bg-white px-2 py-0.5 text-[10px] shadow-sm ring-1 ring-slate-100 transition-all dark:bg-slate-800 dark:ring-slate-700 group-hover:ring-slate-200 dark:group-hover:ring-slate-600"
          :class="isActive(cat.key, cat.value) ? 'text-sky-600 dark:text-sky-400 ring-sky-100 dark:ring-sky-900/50' : 'text-slate-400 dark:text-slate-400'"
        >
          {{ cat.count }}
        </span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import type { LocationQueryValue } from 'vue-router'

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

const getQueryValue = (value: LocationQueryValue | LocationQueryValue[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    const first = value[0]
    return typeof first === 'string' ? first : undefined
  }
  return typeof value === 'string' ? value : undefined
}

const buildCategoryLink = (category: Category) => {
  const query: Record<string, string> = {}
  Object.entries(route.query).forEach(([k, v]) => {
    if (typeof v === 'string') query[k] = v
  })

  if (category.key) query.category = category.value
  else delete query.category
  delete query.page

  return { path: '/articles', query }
}

const isActive = (key: string, value: string) => {
  const activeCategory = getQueryValue(route.query.category)
  if (!key) return !activeCategory
  return activeCategory === value
}
</script>

<style scoped>
.category-filter {
  font-family: 'Plus Jakarta Sans', sans-serif;
}
</style>
