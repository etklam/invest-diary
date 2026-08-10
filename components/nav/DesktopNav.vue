<script setup lang="ts">
import NavLogo from './NavLogo.vue'
import ThemeToggle from './ThemeToggle.vue'
import UserMenu from '../UserMenu.vue'
import NavDropdown from './NavDropdown.vue'
import { useAppShell } from '~/composables/useAppShell'

const { t } = useI18n()
const {
  mainNavItems,
  desktopNavGroups,
  isActive,
  isGroupActive,
  isAuthenticated,
} = useNavigation()

const getIconName = (icon: string) => `heroicons:${icon}`
const { openQuickDiary } = useAppShell()
</script>

<template>
  <div class="mx-auto w-full max-w-7xl">
    <div
      class="relative z-30 flex items-center rounded-dt-md border border-dt-border bg-dt-surface px-4 py-2.5 shadow-dt-sm sm:px-5 sm:py-3"
    >
      <NavLogo />

      <ul class="hidden items-center gap-1 xl:flex">
        <template v-if="isAuthenticated">
          <li>
            <NuxtLink
              to="/timeline"
              class="inline-flex min-h-[44px] items-center gap-2 rounded-dt-sm px-3 py-2 text-sm font-medium text-dt-text-muted transition-colors duration-150 hover:bg-dt-surface-strong hover:text-dt-primary"
              :class="isActive('/timeline') ? 'bg-dt-primary text-white shadow-dt-sm hover:bg-dt-primary-active hover:text-white' : ''"
              :aria-current="isActive('/timeline') ? 'page' : undefined"
            >
              <Icon name="heroicons:clock" class="h-[18px] w-[18px]" />
              <span>{{ t('nav.overview') }}</span>
            </NuxtLink>
          </li>
          <li v-for="group in desktopNavGroups" :key="group.id">
            <NavDropdown :group="group" :active="isGroupActive(group)" />
          </li>
        </template>

        <template v-else>
          <li v-for="item in mainNavItems" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="inline-flex min-h-[44px] items-center gap-2 rounded-dt-sm px-3 py-2 text-sm font-medium text-dt-text-muted transition-colors duration-150 hover:bg-dt-surface-strong hover:text-dt-primary"
              :class="isActive(item.to) ? 'bg-dt-primary text-white shadow-dt-sm hover:bg-dt-primary-active hover:text-white' : ''"
            >
              <Icon :name="getIconName(item.icon)" class="h-[18px] w-[18px]" width="18" height="18" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </li>
        </template>
      </ul>

      <ul class="ml-auto mr-2 hidden items-center gap-2 xl:flex">
        <li v-if="isAuthenticated">
          <BaseButton
            variant="primary"
            :title="t('quickDiary.shortcutHint')"
            @click="openQuickDiary()"
          >
            <Icon name="heroicons:pencil-square" class="h-[18px] w-[18px]" />
            {{ t('diary.quickDiary') }}
          </BaseButton>
        </li>

        <li><LanguageSwitcher /></li>
        <li><ThemeToggle /></li>

        <li v-if="isAuthenticated">
          <UserMenu />
        </li>

        <template v-else>
          <li>
            <NuxtLink
              to="/auth/login"
              class="inline-flex min-h-[44px] items-center rounded-dt-sm px-3 py-1.5 text-sm font-medium text-dt-text-muted transition-colors duration-150 hover:text-dt-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30"
            >
              {{ t('auth.login') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/auth/register"
              class="inline-flex min-h-[44px] items-center rounded-dt-sm bg-dt-primary px-4 py-2 text-sm font-semibold text-white shadow-dt-sm transition-colors duration-150 hover:bg-dt-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30"
            >
              {{ t('auth.register') }}
            </NuxtLink>
          </li>
        </template>
      </ul>

      <slot name="mobile-trigger" />
    </div>
  </div>
</template>
