<template>
  <div v-for="n in count" :key="n" class="skeleton-wrapper">
    <!-- text: 單行文字 loading -->
    <div v-if="variant === 'text'" class="animate-pulse rounded-lg" style="height: 1em; background: var(--color-surface-strong)" />

    <!-- card: 卡片/列表 loading -->
    <div v-else-if="variant === 'card'" class="skeleton-card animate-pulse" style="background: var(--color-surface)">
      <div v-if="showImage" class="skeleton-card-image" style="background: var(--color-surface-strong)" />
      <div class="skeleton-card-body">
        <div class="skeleton-line skeleton-line--title" style="background: var(--color-surface-strong)" />
        <div class="skeleton-line skeleton-line--text" style="background: var(--color-surface-strong)" />
        <div class="skeleton-line skeleton-line--text skeleton-line--short" style="background: var(--color-surface-strong)" />
      </div>
      <div v-if="showMeta" class="skeleton-card-meta">
        <div class="skeleton-circle" style="background: var(--color-surface-strong)" />
        <div class="skeleton-meta-lines">
          <div class="skeleton-line skeleton-line--meta" style="background: var(--color-surface-strong)" />
          <div class="skeleton-line skeleton-line--meta skeleton-line--short" style="background: var(--color-surface-strong)" />
        </div>
      </div>
    </div>

    <!-- article: 文章細節 loading -->
    <div v-else-if="variant === 'article'" class="skeleton-article animate-pulse">
      <div v-if="showImage" class="skeleton-article-image" style="background: var(--color-surface-strong)" />
      <div class="skeleton-article-body">
        <div class="skeleton-tag" style="background: var(--color-surface-strong)" />
        <div class="skeleton-line skeleton-line--heading" style="background: var(--color-surface-strong)" />
        <div class="skeleton-line skeleton-line--text" style="background: var(--color-surface-strong)" />
        <div class="skeleton-line skeleton-line--text" style="background: var(--color-surface-strong)" />
        <div class="skeleton-line skeleton-line--text" style="background: var(--color-surface-strong)" />
        <div class="skeleton-line skeleton-line--text skeleton-line--short" style="background: var(--color-surface-strong)" />
      </div>
    </div>

    <!-- dashboard-stats: 統計數字 loading -->
    <div v-else-if="variant === 'dashboard-stats'" class="skeleton-dashboard animate-pulse">
      <div v-for="i in 4" :key="i" class="skeleton-stat-card" style="background: var(--color-surface)">
        <div class="skeleton-line skeleton-line--label" style="background: var(--color-surface-strong)" />
        <div class="skeleton-line skeleton-line--stat" style="background: var(--color-surface-strong)" />
        <div class="skeleton-line skeleton-line--meta skeleton-line--short" style="background: var(--color-surface-strong)" />
      </div>
    </div>

    <!-- table-row: 表格行 loading -->
    <div v-else-if="variant === 'table-row'" class="skeleton-table-row animate-pulse">
      <div class="skeleton-line" style="width: 12%; background: var(--color-surface-strong)" />
      <div class="skeleton-line" style="width: 18%; background: var(--color-surface-strong)" />
      <div class="skeleton-line" style="width: 22%; background: var(--color-surface-strong)" />
      <div class="skeleton-line" style="width: 16%; background: var(--color-surface-strong)" />
      <div class="skeleton-line" style="width: 14%; background: var(--color-surface-strong)" />
      <div class="skeleton-line" style="width: 10%; background: var(--color-surface-strong)" />
    </div>

    <!-- timeline: 時間軸 loading -->
    <div v-else-if="variant === 'timeline'" class="skeleton-timeline animate-pulse">
      <div class="skeleton-timeline-node" style="background: var(--color-surface-strong)" />
      <div class="skeleton-timeline-content">
        <div class="skeleton-line skeleton-line--title" style="background: var(--color-surface-strong)" />
        <div class="skeleton-line skeleton-line--text" style="background: var(--color-surface-strong)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export type SkeletonVariant = 'text' | 'card' | 'article' | 'dashboard-stats' | 'table-row' | 'timeline'

withDefaults(defineProps<{
  variant?: SkeletonVariant
  count?: number
  showImage?: boolean
  showMeta?: boolean
}>(), {
  variant: 'text',
  count: 1,
  showImage: true,
  showMeta: true,
})
</script>

<style scoped>
.skeleton-wrapper {
  width: 100%;
}

/* Shared primitives */
.skeleton-line {
  height: 1em;
  border-radius: 0.5rem;
}
.skeleton-line--title { width: 60%; height: 1.25em; }
.skeleton-line--heading { width: 70%; height: 2em; }
.skeleton-line--text { width: 100%; height: 0.875em; }
.skeleton-line--short { width: 50%; }
.skeleton-line--meta { width: 8ch; height: 0.75em; }
.skeleton-line--label { width: 6ch; height: 0.625em; }
.skeleton-line--stat { width: 80%; height: 1.75em; margin-top: 0.5rem; }
.skeleton-circle {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Card layout */
.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-radius: 1.5rem;
  padding: 1.25rem;
}
.skeleton-card-image {
  aspect-ratio: 16 / 10;
  border-radius: 1rem;
}
.skeleton-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.skeleton-card-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.25rem;
}
.skeleton-meta-lines {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

/* Article layout */
.skeleton-article {
  max-width: 48rem;
  margin: 0 auto;
}
.skeleton-article-image {
  aspect-ratio: 21 / 9;
  border-radius: 1.5rem;
  margin-bottom: 1.5rem;
}
.skeleton-article-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 36rem;
  margin: 0 auto;
}
.skeleton-tag {
  width: 5rem;
  height: 1.5rem;
  border-radius: 999px;
}

/* Dashboard layout */
.skeleton-dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}
.skeleton-stat-card {
  padding: 1.25rem;
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
}

/* Table row layout */
.skeleton-table-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
}

/* Timeline layout */
.skeleton-timeline {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 0;
}
.skeleton-timeline-node {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  margin-top: 0.35rem;
  flex-shrink: 0;
}
.skeleton-timeline-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
