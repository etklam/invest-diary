<template>
  <div class="settings-page max-w-4xl mx-auto px-4 py-8 sm:py-10">
    <h1 class="settings-h1 text-2xl font-semibold mb-8 sm:text-3xl">
      Telegram 綁定
    </h1>

    <div class="space-y-6">
      <!-- Status Card -->
      <div class="settings-card">
        <h2 class="settings-h2 text-xl font-semibold mb-4">綁定狀態</h2>
        <div v-if="linkedStatus" class="space-y-3">
          <p>已綁定 Telegram 帳號</p>
          <p v-if="linkedStatus.username">使用者名稱: @{{ linkedStatus.username }}</p>
          <p v-if="linkedStatus.firstName">名稱: {{ linkedStatus.firstName }}</p>
          <p v-if="linkedStatus.linkedAt">綁定時間: {{ new Date(linkedStatus.linkedAt).toLocaleString() }}</p>
          <button
            @click="handleUnlink"
            class="settings-btn-danger px-6 py-2.5 rounded-dt-pill text-white"
            :disabled="isUnlinking"
          >
            {{ isUnlinking ? '解除中...' : '解除綁定' }}
          </button>
        </div>
        <div v-else>
          <p class="mb-4">尚未綁定 Telegram</p>
          <button
            @click="generateCode"
            class="settings-btn-primary px-6 py-2.5 rounded-dt-pill text-white"
            :disabled="isGenerating"
          >
            {{ isGenerating ? '產生中...' : '產生驗證碼' }}
          </button>
          <div v-if="verificationCode" class="mt-4 p-4 rounded-lg border" style="background: var(--color-surface-strong); border-color: var(--color-border);">
            <p class="text-2xl font-mono font-bold tracking-widest text-center">{{ verificationCode }}</p>
            <p class="text-sm mt-2">在 Telegram 中發送 <code>/login {{ verificationCode }}</code> 給機器人</p>
            <p class="text-xs mt-1">驗證碼有效期限：10 分鐘</p>
          </div>
        </div>
      </div>

      <!-- Instructions Card -->
      <div class="settings-card">
        <h2 class="settings-h2 text-xl font-semibold mb-4">使用說明</h2>
        <div class="space-y-2 text-sm">
          <p>1. 在 Telegram 搜尋機器人並開始對話</p>
          <p>2. 在此頁面產生驗證碼</p>
          <p>3. 將驗證碼透過 Telegram 發送給機器人</p>
          <p>4. 綁定後即可使用 /buy、/sell、/note 快速記錄</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TelegramStatusLinked {
  linked: true
  telegramId: string
  username: string | null
  firstName: string | null
  lastName: string | null
  language: string
  linkedAt: string
  lastActiveAt: string | null
}

interface TelegramStatusUnlinked {
  linked: false
}

type TelegramStatus = TelegramStatusLinked | TelegramStatusUnlinked

const { data: status, refresh } = useFetch<TelegramStatus>('/api/telegram/status')
const verificationCode = ref('')
const isGenerating = ref(false)
const isUnlinking = ref(false)

const linkedStatus = computed<TelegramStatusLinked | null>(() => {
  if (status.value?.linked) {
    return status.value as TelegramStatusLinked
  }
  return null
})

async function generateCode() {
  isGenerating.value = true
  try {
    const result: { code: string } = await $fetch('/api/telegram/generate-code', { method: 'POST' })
    verificationCode.value = result.code
  } catch (e: any) {
    alert(e?.data?.message || 'Failed to generate code')
  } finally {
    isGenerating.value = false
  }
}

async function handleUnlink() {
  if (!linkedStatus.value) return
  if (!confirm('確定要解除 Telegram 綁定嗎？')) return
  isUnlinking.value = true
  try {
    await $fetch('/api/telegram/unlink', {
      method: 'DELETE',
      body: { telegramId: linkedStatus.value.telegramId },
    })
    await refresh()
  } catch (e: any) {
    alert(e?.data?.message || 'Failed to unlink')
  } finally {
    isUnlinking.value = false
  }
}

definePageMeta({ layout: 'default', middleware: 'auth' })
</script>

<style scoped>
.settings-page { color: var(--color-text); }
.settings-h1, .settings-h2 { font-family: var(--font-display); color: var(--color-text); }
.settings-card { border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); backdrop-filter: blur(12px); box-shadow: var(--shadow-sm); padding: 1.5rem; }
.settings-btn-primary { background: var(--color-primary); box-shadow: 0 12px 24px color-mix(in srgb, var(--color-primary) 24%, transparent); }
.settings-btn-primary:hover:not(:disabled) { background: var(--color-primary-active); transform: translateY(-1px); }
.settings-btn-danger { background: var(--color-danger); box-shadow: 0 12px 24px color-mix(in srgb, var(--color-danger) 24%, transparent); }
.settings-btn-danger:hover:not(:disabled) { background: color-mix(in srgb, var(--color-danger) 84%, black); transform: translateY(-1px); }
code { background: var(--color-surface-strong); padding: 0.125rem 0.375rem; border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 0.875em; }
</style>
