<script setup lang="ts">
const { mainNavItems, toolNavItems, isActive } = useNavigation()
const { isAuthenticated } = useAuth()
const runtimeConfig = useRuntimeConfig()
const publicConfig = runtimeConfig.public

const featuredTools = computed(() => toolNavItems.value.slice(0, 3))
</script>

<template>
  <div class="flex items-center gap-12 w-full">
    <!-- Logo/Home -->
    <NuxtLink to="/" class="flex items-center gap-2 group">
      <div class="w-8 h-8 bg-accent flex items-center justify-center transition-transform duration-standard group-hover:scale-105">
        <Icon name="lucide:book-open" class="text-copy-inverse h-5 w-5" />
      </div>
      <span class="text-lg font-bold tracking-tight text-copy">{{ publicConfig.appName }}</span>
    </NuxtLink>

    <!-- Main Navigation Items -->
    <nav class="flex items-center gap-1 h-full">
      <NuxtLink
        v-for="item in mainNavItems"
        :key="item.to"
        :to="item.to"
        class="px-4 h-full flex items-center text-sm font-medium transition-colors duration-fast border-b-2"
        :class="[
          isActive(item.to) 
            ? 'text-accent border-accent' 
            : 'text-copy-secondary border-transparent hover:text-copy hover:border-line-hover'
        ]"
      >
        {{ item.label }}
      </NuxtLink>

      <!-- Featured Tools -->
      <NuxtLink
        v-for="item in featuredTools"
        :key="item.to"
        :to="item.to"
        class="px-4 h-full flex items-center text-sm font-medium transition-colors duration-fast border-b-2"
        :class="[
          isActive(item.to) 
            ? 'text-accent border-accent' 
            : 'text-copy-secondary border-transparent hover:text-copy hover:border-line-hover'
        ]"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>

    <!-- Right Side Actions -->
    <div class="ml-auto flex items-center gap-4">
      <LanguageSwitcher />
      <UserMenu v-if="isAuthenticated" />
      <NuxtLink 
        v-else 
        to="/auth/login" 
        class="text-sm font-medium text-copy-secondary hover:text-accent transition-colors"
      >
        {{ $t('auth.login') }}
      </NuxtLink>
    </div>
  </div>
</template>
