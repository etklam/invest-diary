<script setup lang="ts">
interface Props {
  currentPage?: number
  totalPages?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currentPage: 1,
  totalPages: 1,
  disabled: false,
})

const emit = defineEmits<{
  'update:currentPage': [page: number]
}>()

const pages = computed(() => {
  const result: Array<number | 'ellipsis'> = []
  const { currentPage, totalPages } = props

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      result.push(i)
    }
  } else {
    if (currentPage <= 3) {
      result.push(1, 2, 3, 4, 'ellipsis', totalPages)
    } else if (currentPage >= totalPages - 2) {
      result.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      result.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages)
    }
  }

  return result
})

const goToPage = (page: number) => {
  if (!props.disabled && page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('update:currentPage', page)
  }
}

const goPrev = () => {
  if (props.currentPage > 1) {
    goToPage(props.currentPage - 1)
  }
}

const goNext = () => {
  if (props.currentPage < props.totalPages) {
    goToPage(props.currentPage + 1)
  }
}
</script>

<template>
  <nav class="flex items-center gap-1" aria-label="Pagination">
    <button
      type="button"
      class="min-w-[36px] h-9 px-3 text-sm font-medium border border-solid rounded-none transition-all duration-fast"
      :class="[
        currentPage <= 1 || disabled
          ? 'text-copy-muted border-line opacity-40 cursor-not-allowed'
          : 'text-copy border-line hover:bg-surface-alt hover:border-line-hover'
      ]"
      :disabled="currentPage <= 1 || disabled"
      @click="goPrev"
    >
      <Icon name="lucide:chevron-left" class="h-4 w-4" />
    </button>

    <button
      v-for="(page, index) in pages"
      :key="`${page}-${index}`"
      type="button"
      class="min-w-[36px] h-9 px-3 text-sm font-medium border border-solid rounded-none transition-all duration-fast"
      :class="[
        page === currentPage
          ? 'bg-accent text-copy-inverse border-accent'
          : page === 'ellipsis' || disabled
            ? 'text-copy-muted border-line opacity-40 cursor-default'
            : 'text-copy border-line hover:bg-surface-alt hover:border-line-hover'
      ]"
      :disabled="disabled || page === 'ellipsis'"
      @click="page !== 'ellipsis' && goToPage(page as number)"
    >
      {{ page === 'ellipsis' ? '...' : page }}
    </button>

    <button
      type="button"
      class="min-w-[36px] h-9 px-3 text-sm font-medium border border-solid rounded-none transition-all duration-fast"
      :class="[
        currentPage >= totalPages || disabled
          ? 'text-copy-muted border-line opacity-40 cursor-not-allowed'
          : 'text-copy border-line hover:bg-surface-alt hover:border-line-hover'
      ]"
      :disabled="currentPage >= totalPages || disabled"
      @click="goNext"
    >
      <Icon name="lucide:chevron-right" class="h-4 w-4" />
    </button>
  </nav>
</template>
