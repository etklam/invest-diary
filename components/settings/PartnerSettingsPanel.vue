<template>
  <div id="partners" class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ t('settings.partnerSectionTitle') }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('settings.partnerSectionDesc') }}
        </p>
      </div>

      <NuxtLink
        to="/timeline/compare"
        class="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 dark:hover:bg-indigo-900/50"
      >
        {{ t('settings.openCompare') }}
      </NuxtLink>
    </div>

    <form class="mt-6 flex flex-col gap-3 sm:flex-row" @submit.prevent="handleCreateLink">
      <input
        v-model="partnerEmail"
        type="email"
        :placeholder="t('settings.partnerEmailPlaceholder')"
        class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      >
      <button
        type="submit"
        :disabled="isSubmitting || !partnerEmail.trim()"
        class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ isSubmitting ? t('common.loading') : t('settings.addPartner') }}
      </button>
    </form>

    <div class="mt-6 space-y-4">
      <div v-if="isLoading" class="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="links.length === 0" class="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {{ t('settings.noPartners') }}
      </div>

      <div v-else class="space-y-4">
        <article
          v-for="link in links"
          :key="link.id"
          class="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/40"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                  {{ link.partner.name || link.partner.email }}
                </h3>
                <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass(link)">
                  {{ statusLabel(link) }}
                </span>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ link.partner.email }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ t('settings.shareStatusDiary', {
                  mine: link.selfSharesDiaries ? t('settings.shareOn') : t('settings.shareOff'),
                  theirs: link.partnerSharesDiaries ? t('settings.shareOn') : t('settings.shareOff')
                }) }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{ t('settings.shareStatusStockNotes', {
                  mine: link.selfSharesStockNotes ? t('settings.shareOn') : t('settings.shareOff'),
                  theirs: link.partnerSharesStockNotes ? t('settings.shareOn') : t('settings.shareOff')
                }) }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <NuxtLink
                v-if="!link.pendingIncoming && !link.pendingOutgoing"
                :to="`/timeline/compare?partnerId=${link.partner.id}`"
                class="inline-flex items-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-700 dark:bg-transparent dark:text-indigo-200 dark:hover:bg-indigo-900/30"
              >
                {{ t('settings.compareWithPartner') }}
              </NuxtLink>

              <button
                v-if="link.pendingIncoming"
                type="button"
                class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                @click="acceptLink(link.id)"
              >
                {{ t('settings.acceptPartner') }}
              </button>

              <button
                type="button"
                class="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-900/20"
                @click="removeLink(link.id)"
              >
                {{ t('settings.removePartner') }}
              </button>
            </div>
          </div>

          <label
            v-if="!link.pendingIncoming && !link.pendingOutgoing"
            class="mt-4 flex items-start gap-3 rounded-xl bg-white px-3 py-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <input
              :checked="link.selfSharesDiaries"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              @change="handleShareChange(link, $event)"
            >
            <span>
              <span class="block font-medium">{{ t('settings.shareMyDiaries') }}</span>
              <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">{{ t('settings.shareMyDiariesHint') }}</span>
            </span>
          </label>

          <label
            v-if="!link.pendingIncoming && !link.pendingOutgoing"
            class="mt-2 flex items-start gap-3 rounded-xl bg-white px-3 py-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <input
              :checked="link.selfSharesStockNotes"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              @change="handleStockNotesShareChange(link, $event)"
            >
            <span>
              <span class="block font-medium">{{ t('settings.shareStockNotes') }}</span>
              <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">{{ t('settings.shareStockNotesHint') }}</span>
            </span>
          </label>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PartnerLinkSummary, PartnerLinksResponse } from '~/types/partner'

const { t } = useI18n()
const toast = useToast()

const links = ref<PartnerLinkSummary[]>([])
const partnerEmail = ref('')
const isLoading = ref(true)
const isSubmitting = ref(false)

const loadLinks = async () => {
  try {
    const response = await $fetch<PartnerLinksResponse>('/api/partners')
    links.value = response.links
  } catch (error: any) {
    toast.error(error?.data?.statusMessage || t('settings.partnerLoadFailed'))
  } finally {
    isLoading.value = false
  }
}

onMounted(loadLinks)

const statusLabel = (link: PartnerLinkSummary) => {
  if (link.pendingIncoming) return t('settings.partnerPendingIncoming')
  if (link.pendingOutgoing) return t('settings.partnerPendingOutgoing')
  return t('settings.partnerConnected')
}

const statusClass = (link: PartnerLinkSummary) => {
  if (link.pendingIncoming) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
  if (link.pendingOutgoing) return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
}

const upsertLink = (link: PartnerLinkSummary) => {
  const existingIndex = links.value.findIndex(item => item.id === link.id)
  if (existingIndex >= 0) {
    links.value.splice(existingIndex, 1, link)
    return
  }
  links.value.unshift(link)
}

const handleCreateLink = async () => {
  if (!partnerEmail.value.trim()) return

  try {
    isSubmitting.value = true
    const response = await $fetch<{ link: PartnerLinkSummary }>('/api/partners', {
      method: 'POST',
      body: {
        partnerEmail: partnerEmail.value,
      },
    })

    upsertLink(response.link)
    partnerEmail.value = ''
    toast.success(t('settings.partnerRequestSent'))
  } catch (error: any) {
    toast.error(error?.data?.statusMessage || t('settings.partnerCreateFailed'))
  } finally {
    isSubmitting.value = false
  }
}

const acceptLink = async (linkId: string) => {
  try {
    const response = await $fetch<{ link: PartnerLinkSummary }>(`/api/partners/${linkId}/accept`, {
      method: 'POST',
    })
    upsertLink(response.link)
    toast.success(t('settings.partnerAccepted'))
  } catch (error: any) {
    toast.error(error?.data?.statusMessage || t('settings.partnerAcceptFailed'))
  }
}

const toggleSharingField = async (link: PartnerLinkSummary, field: 'shareDiaries' | 'shareStockNotes', value: boolean) => {
  const updateField = field === 'shareDiaries' ? 'selfSharesDiaries' : 'selfSharesStockNotes'
  const previous = link[updateField]
  upsertLink({ ...link, [updateField]: value })

  try {
    const response = await $fetch<{ link: PartnerLinkSummary }>(`/api/partners/${link.id}/sharing`, {
      method: 'PUT',
      body: { [field]: value },
    })
    upsertLink(response.link)
    toast.success(value ? t('settings.shareEnabled') : t('settings.shareDisabled'))
  } catch (error: any) {
    upsertLink({ ...link, [updateField]: previous })
    toast.error(error?.data?.statusMessage || t('settings.partnerShareFailed'))
  }
}

const handleShareChange = (link: PartnerLinkSummary, event: Event) => {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  void toggleSharingField(link, 'shareDiaries', target.checked)
}

const handleStockNotesShareChange = (link: PartnerLinkSummary, event: Event) => {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  void toggleSharingField(link, 'shareStockNotes', target.checked)
}

const removeLink = async (linkId: string) => {
  const previous = [...links.value]
  links.value = links.value.filter(link => link.id !== linkId)

  try {
    await $fetch(`/api/partners/${linkId}`, {
      method: 'DELETE',
    })
    toast.success(t('settings.partnerRemoved'))
  } catch (error: any) {
    links.value = previous
    toast.error(error?.data?.statusMessage || t('settings.partnerRemoveFailed'))
  }
}
</script>
