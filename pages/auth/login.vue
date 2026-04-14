<template>
  <div class="min-h-[80vh] flex flex-col justify-center items-center px-6">
    <div class="w-full max-w-[400px] space-y-8">
      <header class="text-center space-y-2">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-accent mb-4">
          <Icon name="lucide:lock" class="text-copy-inverse h-6 w-6" />
        </div>
        <h1 class="text-3xl font-semibold tracking-tight text-copy">
          {{ $t('auth.loginTitle', '歡迎回來') }}
        </h1>
        <p class="text-copy-secondary text-sm">
          {{ $t('auth.loginSubtitle', '請登入以繼續管理您的投資日記') }}
        </p>
      </header>

      <BaseCard class="!p-8">
        <form @submit.prevent="handleLogin" @keydown.enter.prevent="handleLogin" class="space-y-6" onsubmit="return false" novalidate>
          <fieldset :disabled="!isHydrated || isLoading" :aria-busy="!isHydrated || isLoading" class="space-y-6">
            <BaseInput
              v-model="form.email"
              type="email"
              :label="$t('auth.email')"
              id="email"
              :placeholder="$t('auth.emailPlaceholder')"
              required
              autocomplete="email"
              :error="emailError"
              @blur="validateEmail"
            />

            <BaseInput
              v-model="form.password"
              type="password"
              :label="$t('auth.password')"
              id="password"
              :placeholder="$t('auth.passwordPlaceholder')"
              required
              autocomplete="current-password"
            />

            <BaseButton
              type="submit"
              variant="primary"
              class="w-full"
              :loading="isLoading"
              :disabled="!isHydrated || isLoading"
            >
              <span>{{ !isHydrated ? $t('common.loading') : isLoading ? $t('auth.loggingIn') : $t('auth.login') }}</span>
            </BaseButton>
          </fieldset>

          <p v-if="!isHydrated" class="text-xs font-medium text-copy-muted">
            正在準備登入表單，載入完成後即可提交。
          </p>
        </form>

        <div class="mt-8 pt-8 border-t border-line text-center">
          <p class="text-sm text-copy-secondary">
            {{ $t('auth.orCreateAccount') }}
            <NuxtLink to="/auth/register" class="text-accent font-semibold hover:underline">
              {{ $t('auth.createAccount') }}
            </NuxtLink>
          </p>
        </div>
      </BaseCard>

      <footer class="text-center">
        <NuxtLink to="/" class="inline-flex items-center gap-1 text-xs text-copy-muted hover:text-copy transition-colors uppercase tracking-widest font-semibold">
          <Icon name="lucide:arrow-left" class="h-3.5 w-3.5" />
          {{ $t('common.back') }}
        </NuxtLink>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  requiresAuth: false,
  layout: 'auth',
  middleware: 'auth',
})

const { login, isLoading } = useAuth()

const form = ref({
  email: '',
  password: '',
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

const handleLogin = async () => {
  if (!isHydrated.value || isLoading.value) return
  validateEmail()
  if (emailError.value) return

  try {
    await login(form.value.email, form.value.password)
  } catch {
    // login() already handles user-facing error feedback via toast
  }
}
</script>
