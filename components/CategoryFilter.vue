<template>
  <div class="category-filter">
    <nav class="flex flex-col gap-1.5">
      <NuxtLink
        v-for="cat in categories"
        :key="cat.key"
        :to="buildCategoryLink(cat)"
        class="group flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300"
        :class="isActive(cat.key, cat.value)
          ? 'cat-active'
          : 'cat-inactive'"
      >
        <div class="flex items-center gap-3">
          <div
            class="cat-dot h-1.5 w-1.5 rounded-full transition-all duration-300"
            :class="isActive(cat.key, cat.value) ? 'scale-100' : 'scale-0 group-hover:scale-100'"
          />
          <span>{{ cat.label }}</span>
        </div>
        <span
          v-if="cat.count !== undefined"
          class="cat-count rounded-lg px-2 py-0.5 text-[10px] shadow-sm ring-1 transition-all"
          :class="isActive(cat.key, cat.value) ? 'cat-count-active' : 'cat-count-inactive'"
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
.cat-active {
  background: color-mix(in srgb, var(--color-secondary) 12%, transparent);
  color: var(--color-secondary);
}

.cat-inactive {
  color: var(--color-text-soft);
}
.cat-inactive:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.cat-dot {
  background: var(--color-secondary);
}
.cat-inactive .cat-dot {
  background: var(--color-border);
}

.cat-count {
  background: var(--color-surface);
}

.cat-count-active {
  color: var(--color-secondary);
  --tw-ring-color: color-mix(in srgb, var(--color-secondary) 20%, transparent);
}

.cat-count-inactive {
  color: var(--color-text-soft);
  --tw-ring-color: var(--color-border);
}
.group:hover .cat-count-inactive {
  --tw-ring-color: color-mix(in srgb, var(--color-border) 80%, transparent);
}
</style>
