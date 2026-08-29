<template>
  <section class="px-4 pb-20 sm:px-6">
    <div
      class="mx-auto max-w-7xl transition-all duration-700"
      :class="[
        panel ? 'section-panel' : '',
        reveal ? 'reveal' : '',
        revealDelayClass
      ]"
    >
      <div v-if="title || subtitle" class="mb-10">
        <h2 v-if="title" class="section-title text-3xl font-semibold tracking-tight text-dt-text sm:text-4xl">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="section-subtitle mt-3 max-w-3xl text-base text-dt-text-muted sm:text-lg">
          {{ subtitle }}
        </p>
      </div>
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  subtitle?: string
  panel?: boolean
  reveal?: boolean
  revealDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  panel: true,
  reveal: true,
  revealDelay: 0
})

const revealDelayClass = computed(() => {
  if (props.revealDelay === 2) return 'reveal-2'
  if (props.revealDelay === 3) return 'reveal-3'
  if (props.revealDelay === 4) return 'reveal-4'
  return ''
})
</script>

<style scoped>
.section-panel {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

@media (min-width: 768px) {
  .section-panel {
    padding: 2rem;
  }
}

.section-title {
  position: relative;
  padding-left: 0.85rem;
  font-family: var(--font-display);
  letter-spacing: -0.02em;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.2em;
  width: 4px;
  height: 1.2em;
  border-radius: 999px;
  background: var(--color-primary);
}

.section-subtitle {
  line-height: 1.75;
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
