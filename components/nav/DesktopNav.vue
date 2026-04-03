<script setup lang="ts">
import NavLogo from './NavLogo.vue'
import ThemeToggle from './ThemeToggle.vue'
import UserMenu from '../UserMenu.vue'

const { t } = useI18n()
const { mainNavItems, toolNavItems, isActive, isAuthenticated, FEATURED_TOOLS_COUNT } = useNavigation()
const route = useRoute()
const isHomeRoute = computed(() => route.path === '/')

const featuredToolItems = computed(() => toolNavItems.value.slice(0, isAuthenticated.value ? FEATURED_TOOLS_COUNT : 0))
const otherToolItems = computed(() => toolNavItems.value.slice(isAuthenticated.value ? FEATURED_TOOLS_COUNT : 0))

const getIconName = (icon: string) => `heroicons:${icon}`
</script>

<template>
  <div class="mx-auto w-full max-w-7xl">
    <!-- Primary Navigation Bar -->
    <div
      class="relative z-30 flex items-center rounded-2xl px-4 py-2.5 backdrop-blur-xl sm:px-5 sm:py-3"
      :class="isHomeRoute
        ? 'border border-sky-200/70 bg-white/72 shadow-lg shadow-sky-200/35 dark:border-slate-700 dark:bg-slate-900/82 dark:shadow-slate-950/40'
        : 'border border-cyan-100/80 bg-white/80 shadow-lg shadow-cyan-100/40 dark:border-slate-700 dark:bg-slate-900/85 dark:shadow-slate-950/40'"
    >
      <NavLogo />

      <!-- Main Navigation -->
      <ul class="hidden xl:flex xl:items-center xl:gap-1.5">
        <li v-for="item in mainNavItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[0.925rem] font-medium text-slate-600 transition-all duration-200 dark:text-slate-300"
            :class="[
              isHomeRoute
                ? 'hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-slate-800 dark:hover:text-sky-200'
                : 'hover:bg-cyan-50 hover:text-cyan-700 dark:hover:bg-slate-800 dark:hover:text-cyan-200',
              isActive(item.to)
                ? (isHomeRoute
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-700/30 hover:bg-sky-600 hover:text-white dark:bg-sky-700 dark:text-slate-100 dark:hover:bg-sky-600'
                    : 'bg-cyan-600 text-white shadow-sm shadow-cyan-700/30 hover:bg-cyan-600 hover:text-white dark:bg-cyan-700 dark:text-slate-100 dark:hover:bg-cyan-600')
                : ''
            ]"
          >
            <Icon :name="getIconName(item.icon)" class="h-[18px] w-[18px]" width="18" height="18" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </li>
      </ul>

      <!-- Desktop Right Side -->
      <ul class="mr-2 ml-auto hidden items-center gap-3 xl:flex">
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
              class="rounded px-2 py-1 text-sm text-slate-600 transition-colors duration-200 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:hover:text-cyan-200 dark:focus-visible:ring-offset-slate-900"
            >
              {{ t('auth.login') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/auth/register"
              class="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:text-slate-950 dark:focus:ring-offset-slate-900"
              :class="isHomeRoute
                ? 'bg-orange-500 shadow-orange-700/25 hover:bg-orange-400 focus:ring-orange-400 dark:bg-orange-600 dark:hover:bg-orange-500'
                : 'bg-emerald-600 shadow-emerald-700/30 hover:bg-emerald-700 focus:ring-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500'"
            >
              {{ t('auth.register') }}
            </NuxtLink>
          </li>
        </template>
      </ul>

      <!-- Mobile Menu Button Trigger (Defined in Navigation.vue) -->
      <slot name="mobile-trigger" />
    </div>

    <!-- Secondary Navigation Bar -->
    <div
      class="relative z-10 mt-2 hidden rounded-2xl px-4 py-2.5 backdrop-blur-xl xl:block xl:px-5 xl:py-3"
      :class="isHomeRoute
        ? 'border border-sky-200/65 bg-white/70 shadow-md shadow-sky-200/30 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-slate-950/40'
        : 'border border-cyan-100/70 bg-white/80 shadow-md shadow-cyan-100/30 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-slate-950/40'"
    >
      <div class="flex items-center gap-4">
        <ul v-if="featuredToolItems.length > 0" class="flex items-center gap-1">
          <li v-for="item in featuredToolItems" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 dark:text-slate-300 dark:hover:bg-slate-800"
              :class="[
                isHomeRoute
                  ? 'hover:bg-sky-50 hover:text-sky-700 dark:hover:text-sky-200'
                  : 'hover:bg-cyan-50 hover:text-cyan-700 dark:hover:text-cyan-200',
                isActive(item.to)
                  ? (isHomeRoute ? 'bg-sky-50 text-sky-700 dark:bg-slate-800 dark:text-sky-300' : 'bg-cyan-50 text-cyan-700 dark:bg-slate-800 dark:text-cyan-300')
                  : ''
              ]"
            >
              <Icon :name="getIconName(item.icon)" class="h-[18px] w-[18px]" width="18" height="18" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>

        <div v-if="featuredToolItems.length > 0" class="hidden h-7 w-px bg-slate-200 dark:bg-slate-700 xl:block" />

        <div class="min-w-0 flex-1 overflow-hidden">
          <div class="flex items-center gap-2 overflow-x-auto pb-1">
            <p class="shrink-0 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {{ t('nav.tools') }}
            </p>
            <ul class="flex items-center gap-1">
              <li v-for="item in otherToolItems" :key="item.to">
                <NuxtLink
                  :to="item.to"
                  class="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 dark:text-slate-300 dark:hover:bg-slate-800"
                  :class="[
                    isHomeRoute
                      ? 'hover:bg-sky-50 hover:text-sky-700 dark:hover:text-sky-200'
                      : 'hover:bg-cyan-50 hover:text-cyan-700 dark:hover:text-cyan-200',
                    isActive(item.to)
                      ? (isHomeRoute ? 'bg-sky-50 text-sky-700 dark:bg-slate-800 dark:text-sky-300' : 'bg-cyan-50 text-cyan-700 dark:bg-slate-800 dark:text-cyan-300')
                      : ''
                  ]"
                >
                  <Icon :name="getIconName(item.icon)" class="h-[18px] w-[18px]" width="18" height="18" />
                  <span>{{ item.label }}</span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>

        <ul class="ml-auto flex items-center space-x-3">
          <li v-if="isAuthenticated">
            <NuxtLink
              to="/settings"
              class="rounded-lg p-2 text-slate-600 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
              :class="isHomeRoute ? 'hover:bg-sky-50 hover:text-sky-700 dark:hover:text-sky-200' : 'hover:bg-cyan-50 hover:text-cyan-700 dark:hover:text-cyan-200'"
            >
              <Icon name="heroicons:cog-6-tooth" class="h-[18px] w-[18px]" width="18" height="18" />
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
