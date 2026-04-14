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
        <form @submit.prevent="handleLogin" class="space-y-6">
          <BaseInput
            v-model="email"
            type="email"
            :label="$t('auth.email')"
            id="email"
            placeholder="name@example.com"
            required
            autocomplete="email"
          />
          
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label for="password" class="text-sm font-medium text-copy-secondary">
                {{ $t('auth.password') }}
              </label>
            </div>
            <BaseInput
              v-model="password"
              type="password"
              id="password"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
          </div>

          <BaseAlert v-if="error" variant="error">
            {{ error }}
          </BaseAlert>

          <BaseButton
            type="submit"
            variant="primary"
            class="w-full"
            :loading="loading"
          >
            {{ $t('auth.login') }}
          </BaseButton>
        </form>

        <div class="mt-8 pt-8 border-t border-line text-center">
          <p class="text-sm text-copy-secondary">
            {{ $t('auth.noAccount') }}
            <NuxtLink to="/auth/register" class="text-accent font-semibold hover:underline">
              {{ $t('auth.registerNow') }}
            </NuxtLink>
          </p>
        </div>
      </BaseCard>

      <footer class="text-center">
        <NuxtLink to="/" class="text-xs text-copy-muted hover:text-copy transition-colors uppercase tracking-widest font-semibold">
          ← {{ $t('auth.backToHome') }}
        </NuxtLink>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'auth'
})

const { login } = useAuth()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (loading.value) return
  loading.value = true
  error.value = ''
  
  try {
    const success = await login(email.value, password.value)
    if (success) {
      navigateTo('/diaries')
    } else {
      error.value = '登入失敗，請檢查您的帳號密碼。'
    }
  } catch (e: any) {
    error.value = e.message || '發生錯誤，請稍後再試。'
  } finally {
    loading.value = false
  }
}
</script>
