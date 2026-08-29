<script setup lang="ts">
import { computed, resolveComponent } from 'vue'
import { useAppShell } from '~/composables/useAppShell'

const { t } = useI18n()

const { bottomNavItems, isBottomNavActive } = useNavigation()
const { openQuickDiary, openMobileNavigation, showMobileNavigation } = useAppShell()

const navigationItems = computed(() => bottomNavItems.value)

const getIconName = (icon: string) => `heroicons:${icon}`

const runAction = (action?: 'quick-diary' | 'more') => {
  if (action === 'quick-diary') openQuickDiary()
  if (action === 'more') openMobileNavigation()
}
</script>

<template>
  <nav :aria-label="t('nav.mobileLabel')" class="fixed bottom-0 left-0 right-0 z-50 border-t border-dt-border bg-dt-surface pb-safe shadow-[0_-1px_0_rgba(15,23,42,0.04)]">
    <div class="mx-auto flex h-16 max-w-md items-center justify-around px-2">
      <component
        v-for="item in navigationItems"
        :key="item.id"
        :is="item.to ? resolveComponent('NuxtLink') : 'button'"
        :to="item.to"
        type="button"
        class="relative flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors duration-150"
        :class="[
          isBottomNavActive(item) ? 'text-dt-primary' : 'text-dt-text-soft hover:text-dt-text-muted',
          item.action === 'quick-diary' ? 'font-semibold text-dt-primary' : '',
        ]"
        :aria-current="isBottomNavActive(item) ? 'page' : undefined"
        :aria-expanded="item.action === 'more' ? showMobileNavigation : undefined"
        :aria-haspopup="item.action === 'more' ? 'dialog' : undefined"
        @click="item.action && runAction(item.action)"
      >
        <div
          class="relative flex h-8 w-8 items-center justify-center"
          :class="item.action === 'quick-diary' ? 'rounded-full bg-dt-primary-solid text-white shadow-dt-sm' : ''"
        >
          <Icon :name="getIconName(item.icon)" :class="item.action === 'quick-diary' ? 'h-5 w-5' : 'h-6 w-6'" />
        </div>
        <span class="max-w-full truncate text-[10px] font-semibold">{{ item.label }}</span>
      </component>
    </div>
  </nav>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
