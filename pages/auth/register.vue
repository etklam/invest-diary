<template>
  <div class="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-teal-100 bg-white/85 shadow-2xl shadow-teal-900/10 backdrop-blur md:grid-cols-2 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/30">
    <section class="hidden bg-gradient-to-br from-cyan-700 via-teal-600 to-teal-500 p-8 text-white md:flex md:flex-col md:justify-between lg:p-10">
      <div class="space-y-6">
        <p class="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
          {{ $t('common.appName') }}
        </p>
        <h1 class="text-3xl font-extrabold leading-tight lg:text-4xl">
          {{ $t('auth.registerTitle') }}
        </h1>
        <p class="text-sm text-teal-50/90">
          {{ $t('home.cta.description') }}
        </p>
      </div>
      <ul class="space-y-4 text-sm">
        <li class="flex items-center gap-3">
          <Icon name="heroicons:sparkles" class="h-5 w-5 text-orange-300" />
          {{ $t('home.features.timeline.title') }}
        </li>
        <li class="flex items-center gap-3">
          <Icon name="heroicons:sparkles" class="h-5 w-5 text-orange-300" />
          {{ $t('home.features.security.title') }}
        </li>
        <li class="flex items-center gap-3">
          <Icon name="heroicons:sparkles" class="h-5 w-5 text-orange-300" />
          {{ $t('home.features.themes.title') }}
        </li>
      </ul>
    </section>

    <section class="p-6 sm:p-8 lg:p-10" style="font-family: 'Plus Jakarta Sans', sans-serif;">
      <div class="mb-6 space-y-2">
        <p class="text-sm font-medium text-teal-700 dark:text-teal-300">{{ $t('common.appName') }}</p>
        <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{{ $t('auth.registerTitle') }}</h2>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          {{ $t('auth.alreadyHaveAccount') }}
          <NuxtLink
            to="/auth/login"
            class="cursor-pointer font-semibold text-orange-600 transition-colors duration-200 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            {{ $t('auth.loginNow') }}
          </NuxtLink>
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="handleRegister" @keydown.enter.prevent="handleRegister" onsubmit="return false" novalidate>
        <fieldset :disabled="!isHydrated || isLoading" :aria-busy="!isHydrated || isLoading" class="space-y-4">
          <div>
            <label for="name" class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              {{ $t('auth.nameOptional') }}
            </label>
            <div class="relative">
              <Icon name="heroicons:user" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="name"
                v-model="form.name"
                type="text"
                autocomplete="name"
                class="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                :placeholder="$t('auth.namePlaceholder')"
              />
            </div>
          </div>

          <div>
            <label for="email" class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              {{ $t('auth.email') }}
            </label>
            <div class="relative">
              <Icon name="heroicons:envelope" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                v-model="form.email"
                type="email"
                required
                autocomplete="email"
                class="block w-full rounded-xl border bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:bg-slate-950 dark:text-white"
                :class="emailError ? 'border-red-500 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'"
                :placeholder="$t('auth.emailPlaceholder')"
                @blur="validateEmail"
              />
            </div>
            <p v-if="emailError" class="mt-1 text-xs text-red-600 dark:text-red-400">
              {{ emailError }}
            </p>
          </div>

          <div>
            <label for="password" class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              {{ $t('auth.password') }}
            </label>
            <div class="relative">
              <Icon name="heroicons:lock-closed" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                v-model="form.password"
                type="password"
                required
                minlength="8"
                autocomplete="new-password"
                class="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                :placeholder="$t('auth.passwordMinLength')"
              />
            </div>
            <p v-if="form.password && form.password.length < 8" class="mt-1 text-xs text-red-600 dark:text-red-400">
              {{ $t('auth.passwordLengthError') }}
            </p>
          </div>

          <div>
            <label for="confirmPassword" class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              {{ $t('auth.confirmPassword') }}
            </label>
            <div class="relative">
              <Icon name="heroicons:shield-check" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="confirmPassword"
                v-model="form.confirmPassword"
                type="password"
                required
                autocomplete="new-password"
                class="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                :placeholder="$t('auth.confirmPasswordPlaceholder')"
              />
            </div>
            <p v-if="form.confirmPassword && form.password !== form.confirmPassword" class="mt-1 text-xs text-red-600 dark:text-red-400">
              {{ $t('auth.passwordMismatchError') }}
            </p>
          </div>

          <button
            type="button"
            :disabled="!isHydrated || isLoading || !isFormValid"
            @click="handleRegister"
            class="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#f97316] px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#ea580c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg v-if="isLoading || !isHydrated" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{{ !isHydrated ? $t('common.loading') : isLoading ? $t('auth.registering') : $t('auth.register') }}</span>
          </button>
        </fieldset>

        <p v-if="!isHydrated" class="text-xs font-medium text-slate-500 dark:text-slate-400">
          正在準備註冊表單，載入完成後即可提交。
        </p>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  requiresAuth: false,
  layout: 'auth'
})

const { register, isLoading } = useAuth()

const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const isHydrated = ref(false)
const emailError = ref('')

onMounted(() => {
  isHydrated.value = true
})

const validateEmail = () => {
  if (!form.value.email) {
    emailError.value = ''
    return
  }

  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
  emailError.value = emailRegex.test(form.value.email) ? '' : '請輸入有效的電子郵件地址'
}

const isFormValid = computed(() => {
  return (
    form.value.email &&
    form.value.password &&
    form.value.confirmPassword &&
    form.value.password.length >= 8 &&
    form.value.password === form.value.confirmPassword &&
    !emailError.value
  )
})

const handleRegister = async () => {
  validateEmail()
  if (!isFormValid.value) return

  await register({
    email: form.value.email,
    password: form.value.password,
    name: form.value.name || undefined
  })
}
</script>
