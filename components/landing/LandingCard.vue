<template>
  <article
    :class="[
      'landing-card',
      variantClass,
      reveal ? 'reveal' : '',
      revealDelayClass
    ]"
  >
    <div v-if="number" class="number-chip mb-4">{{ number }}</div>
    <Icon v-if="icon" :name="icon" :class="['feature-icon', iconColorClass]" />
    <h3 v-if="title" :class="['mt-4 font-semibold text-dt-text landing-card-title', titleSizeClass]">
      {{ title }}
    </h3>
    <p v-if="description" class="mt-2 text-dt-text-muted">
      {{ description }}
    </p>
    <slot />
  </article>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'feature' | 'metric' | 'number' | 'quiet' | 'featured'
  title?: string
  description?: string
  icon?: string
  iconColor?: string
  number?: string
  reveal?: boolean
  revealDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'feature',
  reveal: false,
  revealDelay: 0
})

const variantClass = computed(() => {
  switch (props.variant) {
    case 'metric': return 'metric-card'
    case 'number': return 'number-card'
    case 'quiet': return 'feature-card feature-card-quiet'
    case 'featured': return 'feature-card feature-card-featured'
    default: return 'feature-card'
  }
})

const titleSizeClass = computed(() => {
  return props.variant === 'metric' ? 'text-2xl' : 'text-xl'
})

const iconColorClass = computed(() => {
  return props.iconColor || 'text-dt-primary'
})

const revealDelayClass = computed(() => {
  if (props.revealDelay === 2) return 'reveal-2'
  if (props.revealDelay === 3) return 'reveal-3'
  if (props.revealDelay === 4) return 'reveal-4'
  return ''
})
</script>

<style scoped>
.landing-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  padding: 1.35rem;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: border-color var(--motion-fast) ease, box-shadow var(--motion-fast) ease;
}

.feature-card::after {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: var(--color-primary);
}

.feature-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
}

.feature-card-featured {
  background: var(--color-surface);
  border-color: var(--color-border-strong);
}

.feature-card-quiet {
  background: var(--color-surface);
  box-shadow: none;
}

.feature-card-quiet::after {
  background: color-mix(in srgb, var(--color-info) 50%, transparent);
}

.metric-card {
  padding: 1rem;
  box-shadow: none;
  background: var(--color-surface);
}

.number-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.8rem;
  height: 2rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

:global(.dark .number-chip),
:global(.dark-mode .number-chip) {
  background: color-mix(in srgb, var(--color-primary) 22%, transparent);
  color: color-mix(in srgb, white 82%, var(--color-primary));
}

.feature-icon {
  width: 2rem;
  height: 2rem;
}

.landing-card-title {
  font-family: var(--font-display);
  letter-spacing: -0.02em;
}

.reveal {
  animation: reveal-up 700ms ease both;
}

.reveal-2 { animation-delay: 120ms; }
.reveal-3 { animation-delay: 220ms; }
.reveal-4 { animation-delay: 300ms; }

@keyframes reveal-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
