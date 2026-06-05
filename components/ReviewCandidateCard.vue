<script setup lang="ts">
import { computed } from 'vue'
import LedgerCard from '~/components/LedgerCard.vue'
import StatusBadge from '~/components/StatusBadge.vue'
import BaseButton from '~/components/BaseButton.vue'

const props = withDefaults(
  defineProps<{
    date: string
    title: string
    thesis?: string
    risk?: string
    reviewStatus: 'none' | 'pending' | 'reviewed'
    reviewDueAt?: string
  }>(),
  {}
)

const emit = defineEmits<{
  review: []
}>()

const statusTone = computed(() => {
  if (props.reviewStatus === 'reviewed') return 'success' as const
  if (props.reviewStatus === 'pending') return 'warning' as const
  return 'neutral' as const
})

const statusLabel = computed(() => {
  if (props.reviewStatus === 'reviewed') return 'Reviewed'
  if (props.reviewStatus === 'pending') return 'Pending'
  return 'No review'
})
</script>

<template>
  <LedgerCard>
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <span class="font-mono text-xs text-dt-text-muted">{{ date }}</span>
        <StatusBadge :tone="statusTone">{{ statusLabel }}</StatusBadge>
      </div>

      <h3 class="text-base font-semibold text-dt-text">{{ title }}</h3>

      <div v-if="thesis" class="text-sm">
        <p class="text-xs font-semibold uppercase tracking-wider text-dt-text-muted">Thesis</p>
        <p class="mt-0.5 text-dt-text leading-relaxed">{{ thesis }}</p>
      </div>

      <div v-if="risk" class="text-sm">
        <p class="text-xs font-semibold uppercase tracking-wider text-dt-text-muted">Risk</p>
        <p class="mt-0.5 text-dt-text leading-relaxed">{{ risk }}</p>
      </div>

      <div class="border-t border-dt-border pt-3">
        <BaseButton variant="ghost" @click="emit('review')">
          Review now
        </BaseButton>
      </div>
    </div>
  </LedgerCard>
</template>
