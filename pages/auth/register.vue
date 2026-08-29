<template>
  <div class="register-shell mx-auto w-full max-w-5xl self-start overflow-hidden rounded-dt-lg border shadow-dt-lg md:grid md:grid-cols-2">
    <section class="register-aside hidden p-8 md:flex md:flex-col md:justify-between lg:p-10">
      <div class="space-y-6">
        <p class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase">
          {{ $t('common.appName') }}
        </p>
        <h1 class="text-3xl font-semibold leading-tight lg:text-4xl">
          {{ $t('auth.registerTitle') }}
        </h1>
        <p class="text-sm leading-7 text-dt-on-ink/90">
          {{ $t('home.cta.description') }}
        </p>
      </div>
      <ul class="aside-features space-y-4 text-sm">
        <li class="flex items-center gap-3">
          <Icon name="heroicons:sparkles" class="h-5 w-5" style="color: var(--color-secondary);" />
          {{ $t('home.features.timeline.title') }}
        </li>
        <li class="flex items-center gap-3">
          <Icon name="heroicons:sparkles" class="h-5 w-5" style="color: var(--color-secondary);" />
          {{ $t('home.features.security.title') }}
        </li>
        <li class="flex items-center gap-3">
          <Icon name="heroicons:sparkles" class="h-5 w-5" style="color: var(--color-secondary);" />
          {{ $t('home.features.themes.title') }}
        </li>
      </ul>
    </section>

    <section class="register-form-panel p-6 sm:p-8 lg:p-10">
      <div class="mb-6 space-y-2">
        <p class="text-sm font-semibold tracking-[0.14em] uppercase" style="color: var(--color-secondary);">{{ $t('common.appName') }}</p>
        <h2 class="register-title text-2xl font-semibold tracking-tight sm:text-3xl">{{ $t('auth.registerTitle') }}</h2>
        <p class="text-sm leading-7" style="color: var(--color-text-muted);">
          {{ $t('auth.alreadyHaveAccount') }}
          <NuxtLink
            to="/auth/login"
            class="cursor-pointer font-semibold transition-colors duration-200 hover:opacity-75 focus-visible:outline-none focus-visible:ring-2"
            style="color: var(--color-secondary);"
          >
            {{ $t('auth.loginNow') }}
          </NuxtLink>
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="handleRegister" @keydown.enter.prevent="handleRegister" onsubmit="return false" novalidate>
        <fieldset :disabled="!isHydrated || isLoading" :aria-busy="!isHydrated || isLoading" class="space-y-4">
          <div>
            <label for="name" class="register-label mb-2 block text-sm font-semibold">
              {{ $t('auth.nameOptional') }}
            </label>
            <div class="relative">
              <Icon name="heroicons:user" class="register-icon pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
              <input
                id="name"
                v-model="form.name"
                type="text"
                autocomplete="name"
                class="register-input block w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none transition-colors duration-200"
                :placeholder="$t('auth.namePlaceholder')"
              />
            </div>
          </div>

          <div>
            <label for="email" class="register-label mb-2 block text-sm font-semibold">
              {{ $t('auth.email') }}
            </label>
            <div class="relative">
              <Icon name="heroicons:envelope" class="register-icon pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
              <input
                id="email"
                v-model="form.email"
                type="email"
                required
                autocomplete="email"
                class="register-input block w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none transition-colors duration-200"
                :class="emailError ? 'register-input-error' : ''"
                :placeholder="$t('auth.emailPlaceholder')"
                @blur="validateEmail"
              />
            </div>
            <p v-if="emailError" class="mt-1 text-xs" style="color: var(--color-danger);">
              {{ emailError }}
            </p>
          </div>

          <div>
            <label for="password" class="register-label mb-2 block text-sm font-semibold">
              {{ $t('auth.password') }}
            </label>
            <div class="relative">
              <Icon name="heroicons:lock-closed" class="register-icon pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
              <input
                id="password"
                v-model="form.password"
                type="password"
                required
                minlength="8"
                autocomplete="new-password"
                class="register-input block w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none transition-colors duration-200"
                :placeholder="$t('auth.passwordMinLength')"
              />
            </div>
            <p v-if="form.password && form.password.length < 8" class="mt-1 text-xs" style="color: var(--color-danger);">
              {{ $t('auth.passwordLengthError') }}
            </p>
          </div>

          <div>
            <label for="confirmPassword" class="register-label mb-2 block text-sm font-semibold">
              {{ $t('auth.confirmPassword') }}
            </label>
            <div class="relative">
              <Icon name="heroicons:shield-check" class="register-icon pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
              <input
                id="confirmPassword"
                v-model="form.confirmPassword"
                type="password"
                required
                autocomplete="new-password"
                class="register-input block w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none transition-colors duration-200"
                :placeholder="$t('auth.confirmPasswordPlaceholder')"
              />
            </div>
            <p v-if="form.confirmPassword && form.password !== form.confirmPassword" class="mt-1 text-xs" style="color: var(--color-danger);">
              {{ $t('auth.passwordMismatchError') }}
            </p>
          </div>

          <button
            type="button"
            :disabled="!isHydrated || isLoading || !isFormValid"
            @click="handleRegister"
            class="register-submit mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg v-if="isLoading || !isHydrated" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{{ !isHydrated ? $t('common.loading') : isLoading ? $t('auth.registering') : $t('auth.register') }}</span>
          </button>
        </fieldset>

        <p v-if="!isHydrated" class="text-xs font-medium" style="color: var(--color-text-soft);">
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

const { register, isLoading } = useAuth()
const { t } = useI18n()

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
  emailError.value = emailRegex.test(form.value.email) ? '' : t('auth.emailInvalid')
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

<style scoped>
.register-shell {
  border-color: var(--color-border);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.register-aside {
  background: var(--color-panel-ink);
  color: var(--color-on-ink);
}

.register-aside > div:first-child p {
  border-color: color-mix(in srgb, white 22%, transparent);
  color: color-mix(in srgb, white 84%, var(--color-secondary));
}

.register-aside h1 {
  color: var(--color-on-ink);
  font-family: var(--font-display);
}

.aside-features {
  border: 1px solid color-mix(in srgb, var(--color-on-ink) 14%, transparent);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  padding: 1.1rem 1.2rem;
}

.register-form-panel {
  background: var(--color-surface);
}

.register-title {
  font-family: var(--font-display);
  color: var(--color-text);
}

.register-label {
  color: var(--color-text-muted);
}

.register-icon {
  color: var(--color-text-soft);
}

.register-input {
  border-color: var(--color-border);
  background: var(--color-surface-strong);
  color: var(--color-text);
}

.register-input::placeholder {
  color: var(--color-text-soft);
}

.register-input:focus {
  border-color: var(--color-secondary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-secondary) 18%, transparent);
}

.register-input-error {
  border-color: var(--color-danger) !important;
}

.register-submit {
  background: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.register-submit:hover {
  background: var(--color-primary-active);
}
</style>
