<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div class="space-y-1">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
        {{ t('settings.apiKeysTitle') }}
      </h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('settings.apiKeysDesc') }}
      </p>
    </div>

    <form class="mt-6 flex flex-col gap-3 sm:flex-row" @submit.prevent="createKey">
      <input
        v-model="label"
        type="text"
        :placeholder="t('settings.apiKeyLabelPlaceholder')"
        class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      >
      <button
        type="submit"
        :disabled="isSubmitting || !label.trim()"
        class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {{ isSubmitting ? t('common.loading') : t('settings.createApiKey') }}
      </button>
    </form>

    <div
      v-if="latestRawKey"
      class="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/20"
    >
      <p class="text-sm font-semibold text-amber-900 dark:text-amber-100">
        {{ t('settings.apiKeyCreatedTitle') }}
      </p>
      <p class="mt-1 text-xs text-amber-800 dark:text-amber-200">
        {{ t('settings.apiKeyCreatedHint') }}
      </p>
      <code class="mt-3 block overflow-x-auto rounded-lg bg-slate-900 px-3 py-3 text-sm text-emerald-300">
        {{ latestRawKey }}
      </code>
    </div>

    <div class="mt-6 space-y-3">
      <div v-if="isLoading" class="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="keys.length === 0" class="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {{ t('settings.noApiKeys') }}
      </div>

      <article
        v-for="key in keys"
        :key="key.id"
        class="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/40"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                {{ key.label }}
              </h3>
              <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {{ key.scope }}
              </span>
              <span
                v-if="key.revokedAt"
                class="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-200"
              >
                {{ t('settings.apiKeyRevoked') }}
              </span>
            </div>
            <p class="mt-1 font-mono text-sm text-gray-500 dark:text-gray-400">
              {{ key.keyPrefix }}...
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ t('settings.apiKeyLastUsed', { value: key.lastUsedAt ? formatDate(key.lastUsedAt) : t('settings.apiKeyNeverUsed') }) }}
            </p>
          </div>

          <button
            v-if="!key.revokedAt"
            type="button"
            class="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-900/20"
            @click="revokeKey(key.id)"
          >
            {{ t('settings.revokeApiKey') }}
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiKeyCreateResponse, ApiKeysResponse, ApiKeySummary } from '~/types/partner'

const { t, locale } = useI18n()
const toast = useToast()

const label = ref('')
const keys = ref<ApiKeySummary[]>([])
const latestRawKey = ref('')
const isLoading = ref(true)
const isSubmitting = ref(false)

const loadKeys = async () => {
  try {
    const response = await $fetch<ApiKeysResponse>('/api/api-keys')
    keys.value = response.keys
  } catch (error: any) {
    toast.error(error?.data?.statusMessage || t('settings.apiKeyLoadFailed'))
  } finally {
    isLoading.value = false
  }
}

onMounted(loadKeys)

const formatDate = (value: string) => new Date(value).toLocaleString(locale.value)

const createKey = async () => {
  if (!label.value.trim()) return

  try {
    isSubmitting.value = true
    const response = await $fetch<ApiKeyCreateResponse>('/api/api-keys', {
      method: 'POST',
      body: { label: label.value },
    })

    keys.value.unshift(response.key)
    latestRawKey.value = response.rawKey
    label.value = ''
    toast.success(t('settings.apiKeyCreateSuccess'))
  } catch (error: any) {
    toast.error(error?.data?.statusMessage || t('settings.apiKeyCreateFailed'))
  } finally {
    isSubmitting.value = false
  }
}

const revokeKey = async (keyId: string) => {
  const previous = [...keys.value]
  keys.value = keys.value.map((key) => key.id === keyId
    ? { ...key, revokedAt: new Date().toISOString() }
    : key)

  try {
    await $fetch(`/api/api-keys/${keyId}`, {
      method: 'DELETE',
    })
    toast.success(t('settings.apiKeyRevokedSuccess'))
  } catch (error: any) {
    keys.value = previous
    toast.error(error?.data?.statusMessage || t('settings.apiKeyRevokeFailed'))
  }
}
</script>
