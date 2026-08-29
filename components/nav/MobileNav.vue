<script setup lang="ts">
import ThemeToggle from './ThemeToggle.vue'
import { ref, watch } from 'vue'
import { useDialogA11y } from '~/composables/useDialogA11y'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()
const { desktopNavGroups, mainNavItems, toolNavItems, isActive, isAuthenticated } = useNavigation()
const { user, logout } = useAuth()
const route = useRoute()
const panelRef = ref<HTMLElement | null>(null)

const getIconName = (icon: string) => `heroicons:${icon}`
const isGroupItemActive = (items: Array<{ to: string }>, to: string) => {
  const activePath = items
    .filter(item => isActive(item.to))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to
  return activePath === to
}

const handleLogout = async () => {
  emit('close')
  await logout()
}

const { handleKeydown } = useDialogA11y(panelRef, {
  open: () => props.isOpen,
  onEscape: () => emit('close'),
})

// Close on route change
watch(() => route.path, () => {
  emit('close')
})

</script>

<template>
  <div
    v-if="isOpen"
    class="fixed bottom-0 left-0 top-0 z-50 w-[82%] sm:max-w-xs lg:w-80"
  >
    <!-- Backdrop -->
    <div
      @click="emit('close')"
      class="fixed inset-0 bg-black/40"
      aria-hidden="true"
    />

    <!-- Mobile Nav Content -->
    <nav
      ref="panelRef"
      class="relative flex h-full w-full flex-col overflow-y-auto border-r border-dt-border bg-dt-surface pb-8 pt-5 shadow-dt-lg sm:pt-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-more-title"
      tabindex="-1"
      @keydown="handleKeydown"
    >
      <div
        class="mb-5 flex w-full items-center justify-between border-b border-dt-border px-5 pb-5 sm:px-6 sm:pb-6"
      >
        <h2 id="mobile-more-title" class="font-display text-xl font-semibold text-dt-text">
          {{ t('nav.more') }}
        </h2>
        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-dt-sm text-dt-text-muted hover:bg-dt-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30"
          :aria-label="t('theme.closeMenu')"
          @click="emit('close')"
        >
          <Icon name="heroicons:x-mark" class="h-6 w-6" />
        </button>
      </div>

      <div v-if="isAuthenticated" class="space-y-6 px-3 pb-6 sm:px-4">
        <section v-for="group in desktopNavGroups" :key="group.id">
          <h3 class="mb-2 px-3 text-xs font-semibold uppercase text-dt-text-muted">
            {{ group.label }}
          </h3>
          <ul class="text-sm font-medium">
            <li v-for="item in group.items" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="flex min-h-11 items-center rounded-dt-sm px-3 py-2.5 pr-2 text-sm transition-colors duration-200"
                :class="isGroupItemActive(group.items, item.to)
                  ? 'bg-dt-primary-solid text-white'
                  : 'text-dt-text hover:bg-dt-surface-strong'"
                :aria-current="isGroupItemActive(group.items, item.to) ? 'page' : undefined"
                @click="emit('close')"
              >
                <Icon :name="getIconName(item.icon)" class="mr-3 h-5 w-5" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </div>

      <div v-else class="space-y-6 px-3 pb-6 sm:px-4">
        <section v-for="(items, label) in { [t('nav.home')]: mainNavItems, [t('nav.tools')]: toolNavItems }" :key="label">
          <h3 class="mb-2 px-3 text-xs font-semibold uppercase text-dt-text-muted">{{ label }}</h3>
          <ul class="text-sm font-medium">
            <li v-for="item in items" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="flex min-h-11 items-center rounded-dt-sm px-3 py-2.5 text-dt-text hover:bg-dt-surface-strong"
                :aria-current="isActive(item.to) ? 'page' : undefined"
                @click="emit('close')"
              >
                <Icon :name="getIconName(item.icon)" class="mr-3 h-5 w-5" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </div>

      <!-- Mobile Auth Section -->
      <div class="px-3 sm:px-4">
        <div class="border-t border-dt-border pt-8">
          <!-- Language & Theme -->
          <div class="flex items-center justify-between mb-4">
            <LanguageSwitcher dropdown-position="left" />
            <ThemeToggle />
          </div>

          <template v-if="isAuthenticated">
            <div class="px-3 py-2 text-sm text-dt-text-muted">
              {{ t('auth.loggedInAs') }}
            </div>
            <div class="px-3 py-2 text-sm text-dt-text font-medium">
              {{ user?.name || user?.email }}
            </div>
            <button
              @click="handleLogout"
              class="flex w-full cursor-pointer items-center rounded-dt-sm px-3 py-3 pr-2 text-dt-danger transition-colors hover:bg-dt-danger/10"
            >
              <Icon name="heroicons:arrow-right-on-rectangle" class="mr-3 h-5 w-5" />
              <span>{{ t('nav.logout') }}</span>
            </button>
          </template>
          <template v-else>
            <NuxtLink
              to="/auth/login"
              class="flex items-center rounded-dt-sm px-3 py-3 pr-2 text-dt-text transition-colors hover:bg-dt-surface-strong"
              @click="emit('close')"
            >
              <Icon name="heroicons:arrow-left-on-rectangle" class="mr-3 h-5 w-5" />
              <span>{{ t('auth.login') }}</span>
            </NuxtLink>
            <NuxtLink
              to="/auth/register"
              class="flex items-center rounded-dt-sm bg-dt-primary-solid px-3 py-3 pr-2 text-white transition-colors font-semibold"
              @click="emit('close')"
            >
              <Icon name="heroicons:user-plus" class="mr-3 h-5 w-5" />
              <span>{{ t('auth.register') }}</span>
            </NuxtLink>
          </template>
        </div>
      </div>
    </nav>
  </div>
</template>
