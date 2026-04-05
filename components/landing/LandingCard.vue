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
    <h3 v-if="title" :class="['mt-4 font-semibold text-slate-950 dark:text-slate-100', titleSizeClass]">
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
  border: 1px solid rgb(186 230 253 / 82%);
  border-radius: 1rem;
  background: rgb(255 255 255 / 84%);
  backdrop-filter: blur(8px);
  padding: 1.35rem;
  position: relative;
  overflow: hidden;
  transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
}

:global(.dark .landing-card),
:global(.dark-mode .landing-card) {
  border-color: rgb(71 85 105);
  background: rgb(10 16 30 / 88%);
}

.feature-card::after {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, rgb(14 165 233 / 95%), rgb(56 189 248 / 25%));
}

.feature-card:hover {
  transform: translateY(-3px);
  border-color: rgb(14 165 233 / 45%);
  box-shadow: 0 16px 34px rgb(14 165 233 / 18%);
}

.feature-card-featured {
  background: linear-gradient(145deg, rgb(255 255 255 / 92%), rgb(224 242 254 / 78%));
}

:global(.dark .feature-card-featured),
:global(.dark-mode .feature-card-featured) {
  background: linear-gradient(145deg, rgb(10 16 30 / 92%), rgb(12 74 110 / 26%));
}

.feature-card-quiet {
  background: rgb(255 255 255 / 78%);
  box-shadow: none;
}

.feature-card-quiet::after {
  background: linear-gradient(90deg, rgb(148 163 184 / 55%), transparent);
}

.metric-card {
  padding: 1rem;
  box-shadow: 0 10px 20px rgb(14 165 233 / 10%);
}

.number-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.8rem;
  height: 2rem;
  border-radius: 999px;
  background: rgb(14 165 233 / 12%);
  color: rgb(3 105 161);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

:global(.dark .number-chip),
:global(.dark-mode .number-chip) {
  background: rgb(56 189 248 / 18%);
  color: rgb(186 230 253);
}

.feature-icon {
  width: 2rem;
  height: 2rem;
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
