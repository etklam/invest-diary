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
        <h2 v-if="title" class="section-title text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="section-subtitle mt-3 max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
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
  border: 1px solid rgb(186 230 253 / 70%);
  border-radius: 1.25rem;
  padding: 1.5rem;
  background: linear-gradient(180deg, rgb(255 255 255 / 72%), rgb(255 255 255 / 56%));
  box-shadow: 0 16px 35px rgb(15 23 42 / 8%);
}

@media (min-width: 768px) {
  .section-panel {
    padding: 2rem;
  }
}

:global(.dark .section-panel),
:global(.dark-mode .section-panel) {
  border-color: rgb(51 65 85 / 88%);
  background: linear-gradient(180deg, rgb(10 16 30 / 86%), rgb(10 16 30 / 76%));
  box-shadow: 0 16px 35px rgb(2 6 23 / 32%);
}

.section-title {
  position: relative;
  padding-left: 0.85rem;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.2em;
  width: 4px;
  height: 1.2em;
  border-radius: 999px;
  background: linear-gradient(180deg, rgb(14 165 233), rgb(249 115 22));
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
