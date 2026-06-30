<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DisciplineShareData } from '~/lib/disciplineShare'
import { useToast } from '~/composables/useToast'

const props = defineProps<{
  show: boolean
  listLength: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()
const toast = useToast()

const shareData = ref<DisciplineShareData | null>(null)
const shareLoading = ref(false)
const includeAuthor = ref(false)
const customTitle = ref('')
const customDescription = ref('')
const copiedToClipboard = ref(false)

const openShareModal = async () => {
  if (props.listLength === 0) {
    toast.error(t('discipline.toast.enterDiscipline'))
    return
  }

  shareLoading.value = true

  try {
    const params = new URLSearchParams()
    if (includeAuthor.value) params.append('includeAuthor', 'true')
    if (customTitle.value) params.append('title', customTitle.value)
    if (customDescription.value) params.append('description', customDescription.value)

    const response = await $fetch<{ success: boolean; data: DisciplineShareData; json: string }>(
      `/api/discipline/export?${params.toString()}`
    )

    if (response.success) {
      shareData.value = response.data
    }
  } catch {
    toast.error(t('discipline.share.exportFailed'))
  } finally {
    shareLoading.value = false
  }
}

const copyJSONToClipboard = async () => {
  if (!shareData.value) return

  const { shareDataToJSON } = await import('~/lib/disciplineShare')
  const json = shareDataToJSON(shareData.value)

  try {
    await navigator.clipboard.writeText(json)
    copiedToClipboard.value = true
    toast.success(t('discipline.share.copiedSuccess'))
    setTimeout(() => {
      copiedToClipboard.value = false
    }, 2000)
  } catch {
    toast.error(t('discipline.share.copiedFailed'))
  }
}

const downloadJSONFile = async () => {
  if (!shareData.value) return

  const { downloadShareFile } = await import('~/lib/disciplineShare')
  downloadShareFile(shareData.value)
  toast.success(t('discipline.share.downloadSuccess'))
}

const shareToSocial = async (platform: 'twitter' | 'facebook' | 'line' | 'whatsapp') => {
  if (!shareData.value) return

  const { generateSocialShareURL } = await import('~/lib/disciplineShare')
  const url = generateSocialShareURL(shareData.value, platform)
  window.open(url, '_blank', 'width=600,height=400')
}

// Watch for modal opening to trigger initial export
watch(() => props.show, (newVal) => {
  if (newVal) {
    openShareModal()
  } else {
    shareData.value = null
    customTitle.value = ''
    customDescription.value = ''
    copiedToClipboard.value = false
  }
})
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/50" @click="emit('close')"></div>
    <div class="relative border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style="background: var(--color-surface); border-color: var(--color-border);">
      <div class="p-6">
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-semibold" style="color: var(--color-text); font-family: var(--font-display);">{{ t('discipline.share.title') }}</h2>
          <button @click="emit('close')" class="transition-colors" style="color: var(--color-text-soft);">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Export Options -->
        <div class="space-y-5 mb-8">
          <h3 class="text-lg font-semibold" style="color: var(--color-text); font-family: var(--font-display);">{{ t('discipline.share.exportTitle') }}</h3>

          <label class="flex items-center space-x-3 cursor-pointer">
            <input type="checkbox" v-model="includeAuthor" class="w-5 h-5 rounded" style="accent-color: var(--color-primary);">
            <span class="text-sm" style="color: var(--color-text);">{{ t('discipline.share.includeAuthor') }}</span>
          </label>

          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--color-text);">{{ t('discipline.share.customTitle') }}</label>
            <input v-model="customTitle" type="text" class="w-full px-4 py-2.5 border rounded-sm focus:outline-none focus:ring-1 transition-colors" style="background: var(--color-surface-muted); border-color: var(--color-border); color: var(--color-text);" :placeholder="t('discipline.share.customTitle')">
          </div>

          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--color-text);">{{ t('discipline.share.customDescription') }}</label>
            <textarea v-model="customDescription" rows="2" class="w-full px-4 py-2.5 border rounded-sm focus:outline-none focus:ring-1 transition-colors resize-none" style="background: var(--color-surface-muted); border-color: var(--color-border); color: var(--color-text);" :placeholder="t('discipline.share.customDescription')"></textarea>
          </div>

          <button @click="openShareModal" class="w-full px-4 py-3 text-white rounded-sm font-medium transition-opacity hover:opacity-90" style="background: var(--color-primary);">
            {{ t('discipline.share.generateJSON') }}
          </button>
        </div>

        <!-- JSON Output -->
        <div v-if="shareData && !shareLoading" class="mb-8">
          <div class="border rounded-sm p-4 mb-4" style="background: var(--color-surface-muted); border-color: var(--color-border);">
            <pre class="text-xs overflow-x-auto font-mono" style="color: var(--color-text-muted);">{{ shareData ? JSON.stringify(shareData, null, 2) : '' }}</pre>
          </div>

          <div class="flex gap-3">
            <button @click="copyJSONToClipboard" class="flex-1 px-4 py-2.5 border rounded-sm font-medium flex items-center justify-center transition-colors" style="background: var(--color-surface-strong); border-color: var(--color-border); color: var(--color-text);">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
              </svg>
              {{ copiedToClipboard ? t('discipline.share.copiedSuccess') : t('discipline.share.copyJSON') }}
            </button>
            <button @click="downloadJSONFile" class="flex-1 px-4 py-2.5 border rounded-sm font-medium flex items-center justify-center transition-colors" style="background: var(--color-surface-strong); border-color: var(--color-border); color: var(--color-text);">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              {{ t('discipline.share.downloadFile') }}
            </button>
          </div>
        </div>

        <!-- Social Share -->
        <div v-if="shareData">
          <h3 class="text-lg font-semibold mb-4" style="color: var(--color-text); font-family: var(--font-display);">{{ t('discipline.share.socialShare') }}</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button @click="shareToSocial('twitter')" class="px-4 py-3 bg-[#1DA1F2] hover:opacity-90 text-white rounded-sm font-medium flex items-center justify-center transition-opacity">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096 2.747-.096-.26-.174-.525-.232-.807-.09-.293-.155-.594-.188-.904.87.07 1.778.152 2.634.456-2.638-.045-5.078-1.38-6.693-3.29a4.92 4.92 0 00-.094.686c0 1.55.79 2.91 1.993 3.732 2.723-.09.21-.172.427-.232.657a4.92 4.92 0 003.947 4.826 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              Twitter
            </button>
            <button @click="shareToSocial('facebook')" class="px-4 py-3 bg-[#4267B2] hover:opacity-90 text-white rounded-sm font-medium flex items-center justify-center transition-opacity">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </button>
            <button @click="shareToSocial('line')" class="px-4 py-3 bg-[#06C755] hover:opacity-90 text-white rounded-sm font-medium flex items-center justify-center transition-opacity">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.486 5.236 3.484 8.414-.002 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.119l-.396-.129c-1.633-.529-2.691-.877-3.183-.877-.536 0-1.052.215-1.052.627 0 .401.215.768.758 1.464l.197.306c.962 1.493 2.093 2.413 3.674 2.413.498 0 .907-.149 1.016-.444.109-.296.109-.692.109-1.016 0-.627-.417-1.387-1.28-2.347-.617-.692-1.247-.537-1.628-.377l-.24.095c-.636.26-1.673.476-2.784 2.258-.725 1.143-.725 2.258-.476 2.504.249.247.657.468 1.26.698l.498.203c1.07.442 2.098.732 3.016.957.918.224 1.686.17 2.284-.251.598-.421.758-.758.758-.478 0-.732-.215-.758-.251-.027-.036-.067-.048-.127-.064-.061-.016-.09-.048-.09-.048-.107-.261-.475-.692-.966-.659-.853-.948-1.07-.948-1.683 0-1.368 1.059-2.685 2.848-2.685.598 0 1.183.047 1.753.141l.617.107c1.276.228 2.325.604 3.125 1.129.8.525 1.203 1.429 1.203 2.671 0 2.258-1.424 4.387-3.881 4.387-1.776 0-3.121-.732-3.912-1.742l-.27-.342-.659.256c-1.458.566-2.712 1.287-3.678 2.131-.966.845-1.945 1.307-3.044 1.307-.469 0-.864-.052-1.185-.156l-.398-.129-.129.396c-.437 1.347-.1 2.822.879 3.915.979 1.093 2.421 1.729 3.98 1.729.893 0 1.744-.172 2.528-.49l.241-.096c.726-.29 1.549-.62 1.875-.768z"/></svg>
              LINE
            </button>
            <button @click="shareToSocial('whatsapp')" class="px-4 py-3 bg-[#25D366] hover:opacity-90 text-white rounded-sm font-medium flex items-center justify-center transition-opacity">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.075-.613-.734-1.165-1.475-.052-.075-.105-.148-.16-.223-.054-.074-.074-.111-.134-.149-.059-.038-.149-.088-.272-.146-.122-.059-.262-.173-.353-.243-.09-.07-.234-.088-.384-.088-.15 0-.27.06-.32.073-.05.013-.099.026-.149.038-.05.013-.099.026-.149.038-.099.025-.198.05-.298.075-.099.025-.198.05-.298.075-.099.025-.198.05-.298.075-.297.149-1.424.852-2.543 1.25-2.543.698 0 1.26.562 1.26 1.26z"/></svg>
              WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
