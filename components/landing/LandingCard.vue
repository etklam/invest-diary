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
    <h3 v-if="title" :class="['mt-4 font-semibold text-slate-950 dark:text-slate-100 landing-card-title', titleSizeClass]">
      {{ title }}
    </h3>
    <p v-if="description" class="mt-2 text-slate-600 dark:text-slate-300">
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
  return props.iconColor || 'text-sky-700 dark:text-sky-400'
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
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 88%, transparent), color-mix(in srgb, var(--color-surface-strong) 82%, transparent));
  backdrop-filter: blur(10px);
  padding: 1.35rem;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform var(--motion-fast) ease, border-color var(--motion-fast) ease, box-shadow var(--motion-fast) ease;
}

:global(.dark .landing-card),
:global(.dark-mode .landing-card) {
  border-color: var(--color-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 92%, transparent), color-mix(in srgb, var(--color-surface-strong) 95%, transparent));
}

.feature-card::after {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-secondary), color-mix(in srgb, var(--color-primary) 38%, transparent));
}

.feature-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
}

.feature-card-featured {
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-secondary) 18%, transparent), transparent 32%),
    linear-gradient(145deg, color-mix(in srgb, var(--color-surface) 92%, transparent), color-mix(in srgb, var(--color-surface-strong) 85%, transparent));
}

:global(.dark .feature-card-featured),
:global(.dark-mode .feature-card-featured) {
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-secondary) 20%, transparent), transparent 30%),
    linear-gradient(145deg, color-mix(in srgb, var(--color-surface) 92%, transparent), color-mix(in srgb, var(--color-surface-strong) 100%, transparent));
}

.feature-card-quiet {
  background: color-mix(in srgb, var(--color-surface) 78%, transparent);
  box-shadow: none;
}

.feature-card-quiet::after {
  background: linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 36%, transparent), transparent);
}

.metric-card {
  padding: 1rem;
  box-shadow: none;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 82%, transparent), color-mix(in srgb, var(--color-surface-strong) 78%, transparent));
}

.number-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.8rem;
  height: 2rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-secondary) 14%, transparent);
  color: var(--color-secondary);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

:global(.dark .number-chip),
:global(.dark-mode .number-chip) {
  background: color-mix(in srgb, var(--color-secondary) 22%, transparent);
  color: color-mix(in srgb, white 82%, var(--color-secondary));
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
