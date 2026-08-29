<script setup lang="ts">
import { useEscapeKey } from '~/composables/useEscapeKey'

const { locale, locales, setLocale } = useI18n()
type LocaleCode = 'en' | 'zh-TW' | 'zh-CN'

const isOpen = ref(false)

// Props to control dropdown position
interface Props {
  dropdownPosition?: 'left' | 'right'
}
const props = withDefaults(defineProps<Props>(), {
  dropdownPosition: 'right'
})

const availableLocales = computed(() =>
  (locales.value as { code: LocaleCode; name: string }[]).filter(l => l.code !== locale.value)
)

const selectLocale = async (code: LocaleCode) => {
  await setLocale(code)
  isOpen.value = false
  // With lazy loading and no_prefix strategy, we need to refresh to apply translations
  await nextTick()
  if (import.meta.client) {
    window.location.reload()
  }
}

// Close dropdown when clicking outside
const closeDropdown = () => {
  isOpen.value = false
}

useEscapeKey(closeDropdown, () => isOpen.value)
</script>

<template>
  <div class="relative z-[90]" v-if="availableLocales.length > 0">
    <button
      @click="isOpen = !isOpen"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      class="p-2 rounded-lg text-dt-text-muted hover:bg-dt-surface-strong transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
      :aria-label="$t('common.switchLanguage')"
    >
      <Icon name="heroicons:language" class="h-5 w-5" />
    </button>

    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute z-[100] mt-2 w-40 rounded-lg bg-dt-surface shadow-dt-md border border-dt-border focus:outline-none"
        :class="props.dropdownPosition === 'left' ? 'left-0' : 'right-0'"
        @click.outside="closeDropdown"
      >
        <div class="py-1">
          <button
            v-for="loc in availableLocales"
            :key="loc.code"
            @click="selectLocale(loc.code)"
            class="block w-full text-left px-4 py-3 text-sm text-dt-text hover:bg-dt-surface-strong transition-colors min-h-[44px]"
          >
            {{ loc.name }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
