<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

interface Props {
  content?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  showDelay?: number
  hideDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  placement: 'top',
  showDelay: 300,
  hideDelay: 100,
})

const emit = defineEmits<{
  show: []
  hide: []
}>()

// ── Internal state ────────────────────────────────────────────────────────────
const isVisible = ref(false)
const tooltipId = `tooltip-${Math.random().toString(36).slice(2, 9)}`

const showTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null)
const hideTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null)

// ── Helpers ───────────────────────────────────────────────────────────────────
const clearTimers = () => {
  if (showTimeoutId.value !== null) {
    clearTimeout(showTimeoutId.value)
    showTimeoutId.value = null
  }
  if (hideTimeoutId.value !== null) {
    clearTimeout(hideTimeoutId.value)
    hideTimeoutId.value = null
  }
}

const scheduleShow = () => {
  clearTimers()
  showTimeoutId.value = setTimeout(() => {
    isVisible.value = true
    emit('show')
  }, props.showDelay)
}

const scheduleHide = () => {
  clearTimers()
  hideTimeoutId.value = setTimeout(() => {
    isVisible.value = false
    emit('hide')
  }, props.hideDelay)
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
onUnmounted(clearTimers)

// ── Positioning ───────────────────────────────────────────────────────────────
const placementClasses = computed(() => ({
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full top-1/2 -translate-y-1/2 ml-2',
}[props.placement]))
</script>

<template>
  <div
    class="relative inline-block"
    @mouseenter="scheduleShow"
    @mouseleave="scheduleHide"
    @focus="scheduleShow"
    @blur="scheduleHide"
  >
    <!-- Trigger slot -->
    <div
      :aria-describedby="isVisible ? tooltipId : undefined"
      class="inline-block outline-none"
    >
      <slot />
    </div>

    <!-- Tooltip -->
    <Transition
      enter-active-class="transition-opacity duration-150 ease-in-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in-out"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isVisible && content"
        :id="tooltipId"
        role="tooltip"
        class="absolute z-[60] max-w-[240px] py-1 px-2 text-xs rounded-sm border border-line text-copy pointer-events-none whitespace-normal break-words"
        style="background-color: var(--bg-elevated);"
        :class="placementClasses"
      >
        {{ content }}
      </div>
    </Transition>
  </div>
</template>
