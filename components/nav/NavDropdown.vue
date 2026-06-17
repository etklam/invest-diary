<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface NavItem {
  label: string
  to: string
  icon: string
}

interface NavGroup {
  id: string
  label: string
  icon: string
  items: NavItem[]
}

const props = defineProps<{
  group: NavGroup
  active: boolean
}>()

const emit = defineEmits<{
  (e: 'navigate'): void
}>()

const isOpen = ref(false)
const focusedIndex = ref(-1)
const rootRef = ref<HTMLElement | null>(null)
const itemRefs = ref<Array<HTMLElement | null>>([])

const getIconName = (icon: string) => `heroicons:${icon}`

const close = () => {
  isOpen.value = false
  focusedIndex.value = -1
}

const toggle = () => {
  isOpen.value = !isOpen.value
  focusedIndex.value = -1
}

const focusItem = (index: number) => {
  const clamped = (index + props.group.items.length) % props.group.items.length
  focusedIndex.value = clamped
  const el = itemRefs.value[clamped] as HTMLElement | null
  if (el && typeof el.focus === 'function') {
    el.focus()
  }
}

const onTriggerKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    if (!isOpen.value) {
      isOpen.value = true
    }
    // Focus first item on next tick after dropdown renders
    void Promise.resolve().then(() => focusItem(0))
  } else if (e.key === 'Escape' && isOpen.value) {
    e.preventDefault()
    close()
  }
}

const onItemKeydown = (e: KeyboardEvent, index: number) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusItem(index + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (index === 0) {
      // Arrow up on first item: keep focus on first (matches native menu behavior)
      focusItem(props.group.items.length - 1)
    } else {
      focusItem(index - 1)
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'Tab') {
    close()
  }
}

const handleNavigate = () => {
  emit('navigate')
  close()
}

// Close on outside click
const handleClickOutside = (event: MouseEvent) => {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    close()
  }
}

// Close on route change so the menu doesn't linger after navigation
const route = useRoute()
watch(() => route.path, () => {
  close()
})

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

const setItemRef = (el: unknown, index: number) => {
  itemRefs.value[index] = (el as HTMLElement) || null
}
</script>

<template>
  <div
    ref="rootRef"
    class="relative"
  >
    <button
      type="button"
      @click="toggle"
      @keydown="onTriggerKeydown"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      :aria-label="group.label"
      class="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[0.925rem] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 dark:hover:bg-slate-800"
      :class="active
        ? 'text-white shadow-sm hover:text-white'
        : 'text-slate-600 hover:bg-[color:color-mix(in_srgb,var(--color-surface-strong)_82%,transparent)] hover:text-[color:var(--color-primary)] dark:text-slate-300'"
      :style="active ? 'background: var(--color-primary);' : ''"
    >
      <Icon :name="getIconName(group.icon)" class="h-[18px] w-[18px]" width="18" height="18" />
      <span>{{ group.label }}</span>
      <Icon
        name="heroicons:chevron-down"
        class="h-3 w-3 transition-transform duration-200"
        :class="isOpen ? 'rotate-180' : ''"
      />
    </button>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute left-0 z-[80] mt-2 w-64 rounded-xl border bg-white/95 py-1 shadow-lg backdrop-blur dark:bg-slate-800/95"
        style="border-color: var(--color-border);"
        role="menu"
        :aria-label="group.label"
      >
        <NuxtLink
          v-for="(item, idx) in group.items"
          :key="item.to"
          :ref="(el) => setItemRef(el, idx)"
          :to="item.to"
          @click="handleNavigate"
          @keydown="onItemKeydown($event, idx)"
          class="flex min-h-[44px] cursor-pointer items-center gap-2 px-4 py-2.5 text-sm outline-none transition-colors"
          :class="idx === focusedIndex
            ? 'bg-cyan-50 text-cyan-700 dark:bg-slate-700 dark:text-cyan-200'
            : 'text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-200 dark:hover:bg-slate-700'"
          role="menuitem"
          :aria-current="active && idx === focusedIndex ? 'page' : undefined"
        >
          <Icon :name="getIconName(item.icon)" class="h-4 w-4" width="16" height="16" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </Transition>
  </div>
</template>
