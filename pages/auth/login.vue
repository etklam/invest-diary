<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="max-w-md w-full space-y-8">
      <!-- Logo/Title -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ $t('common.appName') }}
        </h1>
        <h2 class="mt-6 text-2xl font-semibold text-gray-700 dark:text-gray-200">
          {{ $t('auth.loginTitle') }}
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ $t('auth.orCreateAccount') }} <NuxtLink to="/auth/register" class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            {{ $t('auth.createAccount') }}
          </NuxtLink>
        </p>
      </div>

      <!-- Login Form -->
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin" novalidate>
        <div class="space-y-4">
          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ $t('auth.email') }}
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              class="appearance-none relative block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
              :class="emailError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'"
              :placeholder="$t('auth.emailPlaceholder')"
              @blur="validateEmail"
            />
            <p v-if="emailError" class="mt-1 text-xs text-red-600 dark:text-red-400">
              {{ emailError }}
            </p>
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ $t('auth.password') }}
            </label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              required
              class="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
              :placeholder="$t('auth.passwordPlaceholder')"
            />
          </div>
        </div>

        <!-- Submit Button -->
        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="!isLoading">{{ $t('auth.login') }}</span>
            <span v-else class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ $t('auth.loggingIn') }}
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
// Auth pages are public
definePageMeta({
  requiresAuth: false,
  layout: 'default'
})

const { login, isLoading } = useAuth()

const form = ref({
  email: '',
  password: ''
})

const emailError = ref('')

const validateEmail = () => {
  if (!form.value.email) {
    emailError.value = ''
    return
  }
  // Simple check: must contain @ and at least one character before and after
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
  if (!emailRegex.test(form.value.email)) {
    emailError.value = '請輸入有效的電子郵件地址'
  } else {
    emailError.value = ''
  }
}

const handleLogin = async () => {
  validateEmail()
  if (emailError.value) return

  await login(form.value.email, form.value.password)
}

// (merged into single definePageMeta above)
</script>
