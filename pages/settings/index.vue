<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-8">
      帳戶設定
    </h1>

    <div class="space-y-6">
      <!-- Profile Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          個人資料
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              電子郵件
            </label>
            <input
              :value="user?.email"
              type="email"
              disabled
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">電子郵件無法修改</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              姓名
            </label>
            <input
              v-model="settingsForm.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="您的姓名"
            />
          </div>
        </div>
      </div>

      <!-- Trading Settings Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          交易設定
        </h2>
        <div class="space-y-4">
          <!-- Expected Monthly Trades -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              預計每月交易次數
            </label>
            <input
              v-model.number="settingsForm.expectedMonthlyTrades"
              type="number"
              min="0"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="20"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              設定您預計每個月進行的交易次數
            </p>
          </div>

          <!-- Expected Profit -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              預期利潤
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="text-gray-500 dark:text-gray-400">$</span>
              </div>
              <input
                v-model.number="settingsForm.expectedProfit"
                type="number"
                min="0"
                step="0.01"
                class="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
              />
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              您每個月的預期獲利目標
            </p>
          </div>

          <!-- Expected Average Holding -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              預期平均持倉金額
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="text-gray-500 dark:text-gray-400">$</span>
              </div>
              <input
                v-model.number="settingsForm.expectedAvgHolding"
                type="number"
                min="0"
                step="0.01"
                class="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
              />
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              您預期的平均投資持倉金額
            </p>
          </div>
        </div>

        <!-- Save Settings Button -->
        <div class="mt-6">
          <button
            @click="handleSaveSettings"
            :disabled="isLoading || !hasSettingsChanged"
            class="w-full sm:w-auto px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="!isLoading">儲存設定</span>
            <span v-else class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              儲存中...
            </span>
          </button>
        </div>
      </div>

      <!-- Security Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          安全性
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              目前密碼
            </label>
            <input
              v-model="passwordForm.currentPassword"
              type="password"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="輸入目前密碼"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              新密碼
            </label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              minlength="8"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="至少8個字元"
            />
            <p v-if="passwordForm.newPassword && passwordForm.newPassword.length < 8" class="mt-1 text-xs text-red-600 dark:text-red-400">
              密碼長度至少需要8個字元
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              確認新密碼
            </label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="再次輸入新密碼"
            />
            <p v-if="passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword" class="mt-1 text-xs text-red-600 dark:text-red-400">
              密碼不一致
            </p>
          </div>
        </div>

        <!-- Change Password Button -->
        <div class="mt-6">
          <button
            @click="handleChangePassword"
            :disabled="isLoading || !isPasswordFormValid"
            class="w-full sm:w-auto px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="!isLoading">更改密碼</span>
            <span v-else class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              更改中...
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user, fetchMe, updateSettings, changePassword, isLoading } = useAuth()

// Settings form
const settingsForm = ref({
  name: '',
  expectedMonthlyTrades: 20,
  expectedProfit: 0,
  expectedAvgHolding: 0
})

// Password form
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Track original settings for change detection
const originalSettings = ref({
  name: '',
  expectedMonthlyTrades: 20,
  expectedProfit: 0,
  expectedAvgHolding: 0
})

const hasSettingsChanged = computed(() => {
  return (
    settingsForm.value.name !== originalSettings.value.name ||
    settingsForm.value.expectedMonthlyTrades !== originalSettings.value.expectedMonthlyTrades ||
    settingsForm.value.expectedProfit !== originalSettings.value.expectedProfit ||
    settingsForm.value.expectedAvgHolding !== originalSettings.value.expectedAvgHolding
  )
})

const isPasswordFormValid = computed(() => {
  return (
    passwordForm.value.currentPassword &&
    passwordForm.value.newPassword &&
    passwordForm.value.confirmPassword &&
    passwordForm.value.newPassword.length >= 8 &&
    passwordForm.value.newPassword === passwordForm.value.confirmPassword
  )
})

// Load user settings on mount
onMounted(async () => {
  await fetchMe()
  if (user.value) {
    settingsForm.value = {
      name: user.value.name || '',
      expectedMonthlyTrades: user.value.expectedMonthlyTrades || 20,
      expectedProfit: Number(user.value.expectedProfit) || 0,
      expectedAvgHolding: Number(user.value.expectedAvgHolding) || 0
    }
    originalSettings.value = { ...settingsForm.value }
  }
})

const handleSaveSettings = async () => {
  await updateSettings({
    name: settingsForm.value.name || undefined,
    expectedMonthlyTrades: settingsForm.value.expectedMonthlyTrades,
    expectedProfit: settingsForm.value.expectedProfit,
    expectedAvgHolding: settingsForm.value.expectedAvgHolding
  })

  // Update original settings after save
  originalSettings.value = { ...settingsForm.value }
}

const handleChangePassword = async () => {
  if (!isPasswordFormValid.value) return

  await changePassword(passwordForm.value.currentPassword, passwordForm.value.newPassword)

  // Clear password form after successful change
  passwordForm.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
}

// Set page meta
definePageMeta({
  layout: 'default'
})
</script>
