<template>
  <div class="login-shell mx-auto w-full max-w-5xl self-start overflow-hidden rounded-[28px] border shadow-2xl md:grid md:grid-cols-2">
    <section class="login-aside hidden p-8 md:flex md:flex-col md:justify-between lg:p-10">
      <div class="space-y-6">
        <p class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase">
          {{ $t('common.appName') }}
        </p>
        <h1 class="text-3xl font-semibold leading-tight lg:text-4xl">
          {{ $t('auth.loginTitle') }}
        </h1>
        <p class="text-sm leading-7 text-amber-50/90">
          {{ $t('home.hero.subtitle') }}
        </p>
      </div>
      <div class="aside-note space-y-4 text-sm">
        <div class="aside-row">
          <span>{{ $t('auth.aside.desk') }}</span>
          <strong>{{ $t('auth.aside.deskValue') }}</strong>
        </div>
        <div class="aside-row">
          <span>{{ $t('auth.aside.focus') }}</span>
          <strong>{{ $t('home.features.diary.title') }}</strong>
        </div>
        <div class="aside-row">
          <span>{{ $t('auth.aside.loop') }}</span>
          <strong>{{ $t('home.features.alerts.title') }}</strong>
        </div>
        <p class="text-sm leading-7 text-stone-300">
          {{ $t('auth.aside.pitch') }}
        </p>
      </div>
    </section>

    <section class="login-form-panel p-6 sm:p-8 lg:p-10">
      <div class="mb-8 space-y-2">
        <p class="text-sm font-semibold tracking-[0.14em] uppercase text-[color:var(--color-secondary)]">{{ $t('common.appName') }}</p>
        <h2 class="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ $t('auth.loginTitle') }}</h2>
        <p class="text-sm leading-7 text-slate-600 dark:text-slate-300">
          {{ $t('auth.orCreateAccount') }}
          <NuxtLink
            to="/auth/register"
            class="cursor-pointer font-semibold text-[color:var(--color-secondary)] transition-colors duration-200 hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-secondary)]"
          >
            {{ $t('auth.createAccount') }}
          </NuxtLink>
        </p>
      </div>

      <form class="space-y-5" @submit.prevent="handleLogin" @keydown.enter.prevent="handleLogin" onsubmit="return false" novalidate>
        <fieldset :disabled="!isHydrated || isLoading" :aria-busy="!isHydrated || isLoading" class="space-y-5">
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
                class="login-input block w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none transition-colors duration-200"
                :class="emailError ? 'border-red-500 dark:border-red-500' : ''"
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
                autocomplete="current-password"
                class="login-input block w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none transition-colors duration-200"
                :placeholder="$t('auth.passwordPlaceholder')"
              />
            </div>
          </div>

          <button
            type="button"
            :disabled="!isHydrated || isLoading"
            @click="handleLogin"
            class="login-submit mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg v-if="isLoading || !isHydrated" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{{ !isHydrated ? $t('common.loading') : isLoading ? $t('auth.loggingIn') : $t('auth.login') }}</span>
          </button>
        </fieldset>

        <p v-if="!isHydrated" class="text-xs font-medium text-slate-500 dark:text-slate-400">
          {{ $t('auth.preparingForm') }}
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

const { login, isLoading } = useAuth()
const { t } = useI18n()

const form = ref({
  email: '',
  password: ''
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
  emailError.value = emailRegex.test(form.value.email) ? '' : t('auth.emailInvalid')
}

const handleLogin = async () => {
  validateEmail()
  if (emailError.value) return

  await login(form.value.email, form.value.password)
}
</script>

<style scoped>
.login-shell {
  border-color: var(--color-border);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.login-aside {
  background: var(--color-panel-ink);
  color: #f3eee6;
}

.login-aside > div:first-child p {
  border-color: color-mix(in srgb, white 22%, transparent);
  color: color-mix(in srgb, white 84%, var(--color-secondary));
}

.login-aside h1 {
  color: #fff7ee;
}

.aside-note {
  border: 1px solid rgba(243, 238, 230, 0.14);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  padding: 1.1rem 1.2rem;
}

.aside-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(243, 238, 230, 0.1);
  font-family: var(--font-data);
}

.aside-row:last-of-type {
  margin-bottom: 0.8rem;
}

.login-form-panel {
  background: var(--color-surface);
}

.login-form-panel h2 {
  font-family: var(--font-display);
}

.login-input {
  border-color: var(--color-border);
  background: var(--color-surface-strong);
  color: var(--color-text);
}

.login-input::placeholder {
  color: var(--color-text-soft);
}

.login-input:focus {
  border-color: var(--color-secondary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-secondary) 18%, transparent);
}

.login-submit {
  background: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.login-submit:hover {
  background: var(--color-primary-active);
}
</style>
