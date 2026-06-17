<script setup lang="ts">
import NavLogo from './NavLogo.vue'
import ThemeToggle from './ThemeToggle.vue'
import UserMenu from '../UserMenu.vue'
import NavDropdown from './NavDropdown.vue'

const { t } = useI18n()
const {
  mainNavItems,
  desktopNavGroups,
  isActive,
  isGroupActive,
  isAuthenticated,
} = useNavigation()
const route = useRoute()
const isHomeRoute = computed(() => route.path === '/')

const getIconName = (icon: string) => `heroicons:${icon}`
</script>

<template>
  <div class="mx-auto w-full max-w-7xl">
    <!-- Primary Navigation Bar -->
    <div
      class="relative z-30 flex items-center rounded-2xl px-4 py-2.5 backdrop-blur-xl sm:px-5 sm:py-3"
      :class="isHomeRoute
        ? 'border shadow-lg'
        : 'border shadow-lg'"
      style="border-color: var(--color-border); background: var(--color-surface); box-shadow: var(--shadow-sm);"
    >
      <NavLogo />

      <!-- Desktop Navigation -->
      <ul class="hidden items-center gap-1.5 xl:flex">
        <!-- Authenticated: grouped dropdowns -->
        <template v-if="isAuthenticated">
          <li v-for="group in desktopNavGroups" :key="group.id">
            <NavDropdown :group="group" :active="isGroupActive(group)" />
          </li>
        </template>

        <!-- Guest: flat links -->
        <template v-else>
          <li v-for="item in mainNavItems" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[0.925rem] font-medium text-slate-600 transition-all duration-200 hover:bg-[color:color-mix(in_srgb,var(--color-surface-strong)_82%,transparent)] hover:text-[color:var(--color-primary)] dark:text-slate-300 dark:hover:bg-slate-800"
              :class="isActive(item.to) ? 'text-white shadow-sm hover:text-white' : ''"
              :style="isActive(item.to) ? 'background: var(--color-primary);' : ''"
            >
              <Icon :name="getIconName(item.icon)" class="h-[18px] w-[18px]" width="18" height="18" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </li>
        </template>
      </ul>

      <!-- Desktop Right Side -->
      <ul class="mr-2 ml-auto hidden items-center gap-3 xl:flex">
        <!-- Alerts icon (authenticated only) -->
        <li v-if="isAuthenticated">
          <NuxtLink
            to="/alerts"
            class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-600 transition-colors duration-200 hover:bg-[color:color-mix(in_srgb,var(--color-surface-strong)_82%,transparent)] hover:text-[color:var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:bg-slate-800"
            :class="isActive('/alerts') ? 'text-white shadow-sm' : ''"
            :style="isActive('/alerts') ? 'background: var(--color-primary);' : ''"
            :aria-current="isActive('/alerts') ? 'page' : undefined"
            :aria-label="t('nav.alerts')"
          >
            <Icon name="heroicons:bell" class="h-[18px] w-[18px]" width="18" height="18" />
          </NuxtLink>
        </li>

        <li><LanguageSwitcher /></li>
        <li><ThemeToggle /></li>

        <li v-if="isAuthenticated">
          <UserMenu />
        </li>

        <!-- Guest Auth Buttons -->
        <template v-else>
          <li>
            <NuxtLink
              to="/auth/login"
              class="inline-flex min-h-[44px] items-center rounded px-3 py-1 text-sm text-slate-600 transition-colors duration-200 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:hover:text-cyan-200 dark:focus-visible:ring-offset-slate-900"
            >
              {{ t('auth.login') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/auth/register"
              class="inline-flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:text-slate-950 dark:focus:ring-offset-slate-900"
              :class="isHomeRoute
                ? 'focus:ring-[color:var(--color-secondary)]'
                : 'focus:ring-[color:var(--color-secondary)]'"
              style="background: var(--color-secondary); box-shadow: 0 14px 24px color-mix(in srgb, var(--color-secondary) 28%, transparent);"
            >
              {{ t('auth.register') }}
            </NuxtLink>
          </li>
        </template>
      </ul>

      <!-- Mobile Menu Button Trigger (Defined in Navigation.vue) -->
      <slot name="mobile-trigger" />
    </div>
  </div>
</template>
