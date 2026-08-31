<template>
  <PageContainer width="app" class="settings-page py-8 sm:py-10">
    <div class="mx-auto w-full max-w-4xl">
      <h1 class="settings-h1 text-2xl font-semibold mb-8 sm:text-3xl">
        {{ t('settings.title') }}
      </h1>

    <div class="space-y-6">
      <!-- Profile + Display + Trading sections stay non-editable until user settings load,
           so placeholder defaults never flash as editable values. -->
      <fieldset :disabled="!settingsLoaded" class="space-y-6">
      <!-- Profile Section -->
      <div class="settings-card">
        <h2 class="settings-h2 text-xl font-semibold mb-4">
          {{ t('settings.profile') }}
        </h2>
        <div class="space-y-4">
          <div>
            <label class="settings-label block text-sm font-medium mb-1">
              {{ t('auth.email') }}
            </label>
            <input
              :value="user?.email"
              type="email"
              disabled
              class="settings-input settings-input-disabled w-full px-3 py-2 rounded-dt-sm"
            />
            <p class="settings-hint mt-1 text-xs">{{ t('settings.emailCannotChange') }}</p>
          </div>

          <div>
            <label class="settings-label block text-sm font-medium mb-1">
              {{ t('auth.name') }}
            </label>
            <input
              v-model="settingsForm.name"
              type="text"
              class="settings-input w-full px-3 py-2 rounded-dt-sm"
              :placeholder="t('auth.namePlaceholder')"
            />
          </div>
        </div>
      </div>

      <!-- Display Settings Section -->
      <div class="settings-card">
        <h2 class="settings-h2 text-xl font-semibold mb-4">
          {{ t('settings.displaySettings') }}
        </h2>
        <div class="space-y-4">
          <div>
            <label class="settings-label block text-sm font-medium mb-1">
              {{ t('settings.timezone') }}
            </label>
            <select
              v-model="settingsForm.timezone"
              class="settings-input w-full px-3 py-2 rounded-dt-sm"
            >
              <option value="">{{ t('settings.selectTimezone') }}</option>
              <option value="local">{{ t('settings.localTimezone') }}</option>
              <optgroup v-for="region in groupedTimezones" :key="region.label" :label="region.label">
                <option v-for="tz in region.timezones" :key="tz.value" :value="tz.value">
                  {{ tz.label }}
                </option>
              </optgroup>
            </select>
            <p class="settings-hint mt-1 text-xs">
              {{ t('settings.timezoneDesc') }}
            </p>
          </div>
          <div>
            <label class="flex items-center gap-2 text-sm font-medium" style="color: var(--color-text-muted);">
              <input
                v-model="settingsForm.excludeHolidaysInStats"
                type="checkbox"
                class="settings-checkbox h-4 w-4 rounded"
              >
              <span>{{ t('settings.excludeHolidays') }}</span>
            </label>
            <p class="settings-hint mt-1 text-xs">
              {{ t('settings.excludeHolidaysDesc') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Trading Settings Section -->
      <div class="settings-card">
        <h2 class="settings-h2 text-xl font-semibold mb-4">
          {{ t('settings.tradingSettings') }}
        </h2>
        <div class="space-y-4">
          <div>
            <label class="settings-label block text-sm font-medium mb-1">
              {{ t('settings.expectedMonthlyTrades') }}
            </label>
            <input
              v-model.number="settingsForm.expectedMonthlyTrades"
              type="number"
              min="0"
              class="settings-input w-full px-3 py-2 rounded-dt-sm"
              placeholder="20"
            />
            <p class="settings-hint mt-1 text-xs">
              {{ t('settings.expectedMonthlyTradesDesc') }}
            </p>
          </div>

          <div>
            <label class="settings-label block text-sm font-medium mb-1">
              {{ t('settings.expectedProfit') }}
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="settings-hint text-sm">$</span>
              </div>
              <input
                v-model.number="settingsForm.expectedProfit"
                type="number"
                min="0"
                step="0.01"
                class="settings-input w-full pl-8 pr-3 py-2 rounded-dt-sm"
                placeholder="0.00"
              />
            </div>
            <p class="settings-hint mt-1 text-xs">
              {{ t('settings.expectedProfitDesc') }}
            </p>
          </div>

          <div>
            <label class="settings-label block text-sm font-medium mb-1">
              {{ t('settings.expectedAvgHolding') }}
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="settings-hint text-sm">$</span>
              </div>
              <input
                v-model.number="settingsForm.expectedAvgHolding"
                type="number"
                min="0"
                step="0.01"
                class="settings-input w-full pl-8 pr-3 py-2 rounded-dt-sm"
                placeholder="0.00"
              />
            </div>
            <p class="settings-hint mt-1 text-xs">
              {{ t('settings.expectedAvgHoldingDesc') }}
            </p>
          </div>
        </div>

        <div class="mt-6">
          <button
            @click="handleSaveSettings"
            :disabled="isLoading || !hasSettingsChanged"
            class="settings-btn-primary w-full sm:w-auto px-6 py-2.5 text-sm font-semibold rounded-dt-pill text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
      </fieldset>

      <!-- Security Section -->
      <div class="settings-card">
        <h2 class="settings-h2 text-xl font-semibold mb-4">
          {{ t('settings.changePassword') }}
        </h2>
        <div class="space-y-4">
          <div>
            <label class="settings-label block text-sm font-medium mb-1">
              {{ t('settings.currentPassword') }}
            </label>
            <input
              v-model="passwordForm.currentPassword"
              type="password"
              class="settings-input w-full px-3 py-2 rounded-dt-sm"
              :placeholder="t('auth.passwordPlaceholder')"
            />
          </div>

          <div>
            <label class="settings-label block text-sm font-medium mb-1">
              {{ t('settings.newPassword') }}
            </label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              minlength="8"
              class="settings-input w-full px-3 py-2 rounded-dt-sm"
              :placeholder="t('auth.passwordMinLength')"
            />
            <p v-if="passwordForm.newPassword && passwordForm.newPassword.length < 8" class="mt-1 text-xs" style="color: var(--color-danger);">
              {{ t('settings.passwordTooShort') }}
            </p>
          </div>

          <div>
            <label class="settings-label block text-sm font-medium mb-1">
              {{ t('settings.confirmNewPassword') }}
            </label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              class="settings-input w-full px-3 py-2 rounded-dt-sm"
              :placeholder="t('auth.confirmPasswordPlaceholder')"
            />
            <p v-if="passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword" class="mt-1 text-xs" style="color: var(--color-danger);">
              {{ t('settings.passwordMismatch') }}
            </p>
          </div>
        </div>

        <div class="mt-6">
          <button
            @click="handleChangePassword"
            :disabled="isLoading || !isPasswordFormValid"
            class="settings-btn-danger w-full sm:w-auto px-6 py-2.5 text-sm font-semibold rounded-dt-pill text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
  </PageContainer>
</template>

<script setup lang="ts">
import { resolveUserTimezone } from '~/lib/dates/user-tz'

const { t } = useI18n()
const { user, fetchMe, updateSettings, changePassword, isLoading } = useAuth()
const { commonTimezones, detectLocalTimezone } = useTimezone()

// Settings form
const settingsForm = ref({
  name: '',
  expectedMonthlyTrades: 20,
  expectedProfit: 0,
  expectedAvgHolding: 0,
  timezone: '',
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
  timezone: '',
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
const settingsLoaded = ref(false)

onMounted(async () => {
  await fetchMe()
  if (user.value) {
    settingsForm.value = {
      name: user.value.name || '',
      expectedMonthlyTrades: user.value.expectedMonthlyTrades || 20,
      expectedProfit: Number(user.value.expectedProfit) || 0,
      expectedAvgHolding: Number(user.value.expectedAvgHolding) || 0,
      timezone: resolveUserTimezone(user.value),
      excludeHolidaysInStats: localStorage.getItem('exclude_holidays_in_stats') !== 'false'
    }
    originalSettings.value = { ...settingsForm.value }
  }
  settingsLoaded.value = true
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
  layout: 'default',
  middleware: 'auth'
})
</script>

<style scoped>
.settings-page {
  color: var(--color-text);
}

.settings-h1 {
  font-family: var(--font-display);
  color: var(--color-text);
}

.settings-h2 {
  font-family: var(--font-display);
  color: var(--color-text);
}

.settings-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-sm);
  padding: 1.25rem;
}

@media (min-width: 640px) {
  .settings-card {
    padding: 1.5rem;
  }
}

.settings-label {
  color: var(--color-text-muted);
}

.settings-hint {
  color: var(--color-text-soft);
}

.settings-input {
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface-strong) 66%, transparent);
  color: var(--color-text);
  transition: border-color var(--motion-fast) ease, box-shadow var(--motion-fast) ease;
}

.settings-input::placeholder {
  color: var(--color-text-soft);
}

.settings-input:focus {
  outline: none;
  border-color: var(--color-secondary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-secondary) 18%, transparent);
}

.settings-input-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: color-mix(in srgb, var(--color-surface-strong) 90%, transparent);
}

.settings-checkbox {
  accent-color: var(--color-primary);
  border-color: var(--color-border);
}

.settings-btn-primary {
  background: var(--color-primary);
  box-shadow: 0 12px 24px color-mix(in srgb, var(--color-primary) 24%, transparent);
}

.settings-btn-primary:hover:not(:disabled) {
  background: var(--color-primary-active);
  transform: translateY(-1px);
}

.settings-btn-danger {
  background: var(--color-danger);
  box-shadow: 0 12px 24px color-mix(in srgb, var(--color-danger) 24%, transparent);
}

.settings-btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-danger) 84%, black);
  transform: translateY(-1px);
}
</style>
