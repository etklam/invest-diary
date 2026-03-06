<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-8">
      {{ t('settings.title') }}
    </h1>

    <div class="space-y-6">
      <!-- Profile Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {{ t('settings.profile') }}
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('auth.email') }}
            </label>
            <input
              :value="user?.email"
              type="email"
              disabled
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t('settings.emailCannotChange') }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('auth.name') }}
            </label>
            <input
              v-model="settingsForm.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              :placeholder="t('auth.namePlaceholder')"
            />
          </div>
        </div>
      </div>

      <!-- Display Settings Section (NEW) -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {{ t('settings.displaySettings') }}
        </h2>
        <div class="space-y-4">
          <!-- Timezone Selector -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('settings.timezone') }}
            </label>
            <select
              v-model="settingsForm.timezone"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">{{ t('settings.selectTimezone') }}</option>
              <option value="local">{{ t('settings.localTimezone') }}</option>
              <optgroup v-for="region in groupedTimezones" :key="region.label" :label="region.label">
                <option v-for="tz in region.timezones" :key="tz.value" :value="tz.value">
                  {{ tz.label }}
                </option>
              </optgroup>
            </select>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ t('settings.timezoneDesc') }}
            </p>
          </div>
          <div>
            <label class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                v-model="settingsForm.excludeHolidaysInStats"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              >
              <span>統計排除國定假日（依時區）</span>
            </label>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              以 Nager.Date 自動抓取假日，計算記錄率時不納入分母。
            </p>
          </div>
        </div>
      </div>

      <!-- Trading Settings Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {{ t('settings.tradingSettings') }}
        </h2>
        <div class="space-y-4">
          <!-- Expected Monthly Trades -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('settings.expectedMonthlyTrades') }}
            </label>
            <input
              v-model.number="settingsForm.expectedMonthlyTrades"
              type="number"
              min="0"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="20"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ t('settings.expectedMonthlyTradesDesc') }}
            </p>
          </div>

          <!-- Expected Profit -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('settings.expectedProfit') }}
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
              {{ t('settings.expectedProfitDesc') }}
            </p>
          </div>

          <!-- Expected Average Holding -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('settings.expectedAvgHolding') }}
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
              {{ t('settings.expectedAvgHoldingDesc') }}
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
            <span v-if="!isLoading">{{ t('common.save') }}</span>
            <span v-else class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ t('common.loading') }}
            </span>
          </button>
        </div>
      </div>

      <!-- Security Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {{ t('settings.changePassword') }}
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('settings.currentPassword') }}
            </label>
            <input
              v-model="passwordForm.currentPassword"
              type="password"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              :placeholder="t('auth.passwordPlaceholder')"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('settings.newPassword') }}
            </label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              minlength="8"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              :placeholder="t('auth.passwordMinLength')"
            />
            <p v-if="passwordForm.newPassword && passwordForm.newPassword.length < 8" class="mt-1 text-xs text-red-600 dark:text-red-400">
              {{ t('settings.passwordTooShort') }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ t('settings.confirmNewPassword') }}
            </label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              :placeholder="t('auth.confirmPasswordPlaceholder')"
            />
            <p v-if="passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword" class="mt-1 text-xs text-red-600 dark:text-red-400">
              {{ t('settings.passwordMismatch') }}
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
            <span v-if="!isLoading">{{ t('settings.changePassword') }}</span>
            <span v-else class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ t('common.loading') }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { user, fetchMe, updateSettings, changePassword, isLoading } = useAuth()
const { commonTimezones, detectLocalTimezone, getTimezone } = useTimezone()

// Settings form
const settingsForm = ref({
  name: '',
  expectedMonthlyTrades: 20,
  expectedProfit: 0,
  expectedAvgHolding: 0,
  timezone: 'Asia/Taipei',
  excludeHolidaysInStats: true
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
  expectedAvgHolding: 0,
  timezone: 'Asia/Taipei',
  excludeHolidaysInStats: true
})

const hasSettingsChanged = computed(() => {
  return (
    settingsForm.value.name !== originalSettings.value.name ||
    settingsForm.value.expectedMonthlyTrades !== originalSettings.value.expectedMonthlyTrades ||
    settingsForm.value.expectedProfit !== originalSettings.value.expectedProfit ||
    settingsForm.value.expectedAvgHolding !== originalSettings.value.expectedAvgHolding ||
    settingsForm.value.timezone !== originalSettings.value.timezone ||
    settingsForm.value.excludeHolidaysInStats !== originalSettings.value.excludeHolidaysInStats
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

// Group timezones by region for better UX
const groupedTimezones = computed(() => {
  const regions = [
    {
      label: t('settings.timezone') + ' - Asia',
      timezones: commonTimezones.filter(tz =>
        tz.value.startsWith('Asia/') ||
        tz.value === 'Asia/Taipei' ||
        tz.value === 'Asia/Hong_Kong' ||
        tz.value === 'Asia/Shanghai' ||
        tz.value === 'Asia/Singapore' ||
        tz.value === 'Asia/Tokyo' ||
        tz.value === 'Asia/Seoul'
      )
    },
    {
      label: t('settings.timezone') + ' - Americas',
      timezones: commonTimezones.filter(tz => tz.value.startsWith('America/'))
    },
    {
      label: t('settings.timezone') + ' - Europe',
      timezones: commonTimezones.filter(tz => tz.value.startsWith('Europe/'))
    },
    {
      label: t('settings.timezone') + ' - Other',
      timezones: commonTimezones.filter(tz =>
        tz.value === 'UTC' || tz.value.startsWith('Australia/')
      )
    }
  ]
  return regions.filter(r => r.timezones.length > 0)
})

// Watch for timezone selection changes
watch(() => settingsForm.value.timezone, (newValue) => {
  if (newValue === 'local') {
    settingsForm.value.timezone = detectLocalTimezone()
  }
})

// Load user settings on mount
onMounted(async () => {
  await fetchMe()
  if (user.value) {
    settingsForm.value = {
      name: user.value.name || '',
      expectedMonthlyTrades: user.value.expectedMonthlyTrades || 20,
      expectedProfit: Number(user.value.expectedProfit) || 0,
      expectedAvgHolding: Number(user.value.expectedAvgHolding) || 0,
      timezone: user.value.timezone || 'Asia/Taipei',
      excludeHolidaysInStats: localStorage.getItem('exclude_holidays_in_stats') !== 'false'
    }
    originalSettings.value = { ...settingsForm.value }
  }
})

const handleSaveSettings = async () => {
  await updateSettings({
    name: settingsForm.value.name || undefined,
    expectedMonthlyTrades: settingsForm.value.expectedMonthlyTrades,
    expectedProfit: settingsForm.value.expectedProfit,
    expectedAvgHolding: settingsForm.value.expectedAvgHolding,
    timezone: settingsForm.value.timezone
  })
  localStorage.setItem('exclude_holidays_in_stats', String(settingsForm.value.excludeHolidaysInStats))

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
