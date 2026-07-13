<template>
  <div class="partners-page">
    <!-- Header -->
    <section class="ledger-hero">
      <div class="hero-copy">
        <p class="kicker">{{ t('partners.title') }}</p>
        <h1 class="hero-title">{{ t('partners.title') }}</h1>
        <p class="hero-summary">{{ t('settings.partnerSectionDesc') }}</p>
      </div>
      <div class="hero-actions">
        <NuxtLink
          to="/diaries"
          class="action-btn-muted cursor-pointer"
        >
          <Icon name="heroicons:arrow-left" class="h-4 w-4" />
          {{ t('partners.backToDashboard') }}
        </NuxtLink>
        <NuxtLink
          to="/timeline/compare"
          class="action-btn-muted cursor-pointer"
        >
          <Icon name="heroicons:arrows-right-left" class="h-4 w-4" />
          {{ t('settings.openCompare') }}
        </NuxtLink>
      </div>
    </section>

    <!-- Stats Overview -->
    <section class="stats-grid">
      <article class="stat-card stat-connected">
        <span class="stat-icon"><Icon name="heroicons:user-group-solid" class="w-5 h-5" /></span>
        <span class="stat-value">{{ connectedCount }}</span>
        <span class="stat-label">{{ t('settings.partnerConnected') }}</span>
      </article>
      <article class="stat-card stat-pending">
        <span class="stat-icon"><Icon name="heroicons:clock" class="w-5 h-5" /></span>
        <span class="stat-value">{{ pendingCount }}</span>
        <span class="stat-label">{{ t('settings.partnerPendingIncoming') }}</span>
      </article>
      <article class="stat-card stat-sharing">
        <span class="stat-icon"><Icon name="heroicons:eye" class="w-5 h-5" /></span>
        <span class="stat-value">{{ sharingCount }}</span>
        <span class="stat-label">{{ t('settings.shareEnabled') }}</span>
      </article>
      <article class="stat-card stat-apikeys">
        <span class="stat-icon"><Icon name="heroicons:key" class="w-5 h-5" /></span>
        <span class="stat-value">{{ activeKeyCount }}</span>
        <span class="stat-label">{{ t('settings.apiKeysTitle') }}</span>
      </article>
    </section>

    <!-- Partner Relationships -->
    <section class="content-section">
      <div class="section-head">
        <h2 class="section-title">
          <Icon name="heroicons:user-group" class="w-5 h-5" />
          {{ t('settings.partnerSectionTitle') }}
        </h2>
        <p class="section-desc">{{ t('settings.partnerSectionDesc') }}</p>
      </div>

      <!-- Add Partner Form -->
      <form class="add-partner-form" @submit.prevent="handleCreateLink">
        <input
          v-model="partnerEmail"
          type="email"
          :placeholder="t('settings.partnerEmailPlaceholder')"
          class="partner-input"
        >
        <button
          type="submit"
          :disabled="isSubmitting || !partnerEmail.trim()"
          class="action-btn-primary"
        >
          <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <Icon v-else name="heroicons:plus" class="w-4 h-4" />
          {{ isSubmitting ? t('common.loading') : t('settings.addPartner') }}
        </button>
      </form>

      <!-- Partner List -->
      <div v-if="isPartnersLoading" class="empty-state">
        <Icon name="heroicons:arrow-path" class="w-6 h-6 animate-spin empty-icon" />
        <p>{{ t('common.loading') }}</p>
      </div>

      <div v-else-if="links.length === 0" class="empty-state">
        <Icon name="heroicons:user-group" class="w-12 h-12 empty-icon" />
        <h3 class="empty-title">{{ t('settings.noPartners') }}</h3>
        <p class="empty-desc">
          {{ t('partners.emptyHint') }}
        </p>
      </div>

      <div v-else class="partner-list">
        <article
          v-for="link in links"
          :key="link.id"
          class="partner-card"
          :class="{
            'partner-pending': link.status !== 'connected',
            'partner-connected': link.status === 'connected'
          }"
        >
          <div class="partner-card-top">
            <div class="partner-info">
              <div class="partner-avatar">
                <Icon v-if="link.status === 'pending_incoming'" name="heroicons:arrow-left-on-rectangle" class="w-5 h-5" />
                <Icon v-else-if="link.status === 'pending_outgoing'" name="heroicons:paper-airplane" class="w-5 h-5" />
                <Icon v-else name="heroicons:user-circle" class="w-5 h-5" />
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="partner-name">{{ link.partner.name || link.partner.email }}</h3>
                  <span class="partner-status-badge" :class="statusClass(link)">
                    {{ statusLabel(link) }}
                  </span>
                </div>
                <p class="partner-email">{{ link.partner.email }}</p>
              </div>
            </div>

            <div class="partner-actions">
              <NuxtLink
                v-if="link.status === 'connected'"
                :to="`/timeline/compare?partnerId=${link.partner.id}`"
                class="action-btn-sm"
              >
                <Icon name="heroicons:arrows-right-left" class="w-4 h-4" />
                {{ t('settings.compareWithPartner') }}
              </NuxtLink>

              <button
                v-if="link.status === 'pending_incoming'"
                type="button"
                class="action-btn-primary action-btn-sm"
                @click="acceptLink(link.id)"
              >
                <Icon name="heroicons:check" class="w-4 h-4" />
                {{ t('settings.acceptPartner') }}
              </button>

              <button
                type="button"
                class="action-btn-danger-sm"
                @click="removeLink(link.id)"
              >
                <Icon name="heroicons:trash" class="w-4 h-4" />
                {{ t('settings.removePartner') }}
              </button>
            </div>
          </div>

          <!-- Sharing Toggles (only for accepted links) -->
          <div v-if="link.status === 'connected'" class="partner-card-bottom">
            <div class="sharing-summary">
              <span class="sharing-pill" :class="link.selfSharesDiaries ? 'pill-on' : 'pill-off'">
                <Icon :name="link.selfSharesDiaries ? 'heroicons:eye' : 'heroicons:eye-slash'" class="w-3.5 h-3.5" />
                {{ t('settings.shareStatusDiary', {
                  mine: link.selfSharesDiaries ? t('settings.shareOn') : t('settings.shareOff'),
                  theirs: link.partnerSharesDiaries ? t('settings.shareOn') : t('settings.shareOff')
                }) }}
              </span>
              <span class="sharing-pill" :class="link.selfSharesStockNotes ? 'pill-on' : 'pill-off'">
                <Icon :name="link.selfSharesStockNotes ? 'heroicons:document-text' : 'heroicons:document-text'" class="w-3.5 h-3.5" />
                {{ t('settings.shareStatusStockNotes', {
                  mine: link.selfSharesStockNotes ? t('settings.shareOn') : t('settings.shareOff'),
                  theirs: link.partnerSharesStockNotes ? t('settings.shareOn') : t('settings.shareOff')
                }) }}
              </span>
            </div>

            <div class="sharing-toggles">
              <label class="toggle-row">
                <input
                  :checked="link.selfSharesDiaries"
                  type="checkbox"
                  class="toggle-input"
                  @change="handleShareChange(link, $event)"
                >
                <span class="toggle-label">
                  <span class="toggle-title">{{ t('settings.shareMyDiaries') }}</span>
                  <span class="toggle-hint">{{ t('settings.shareMyDiariesHint') }}</span>
                </span>
              </label>

              <label class="toggle-row">
                <input
                  :checked="link.selfSharesStockNotes"
                  type="checkbox"
                  class="toggle-input"
                  @change="handleStockNotesShareChange(link, $event)"
                >
                <span class="toggle-label">
                  <span class="toggle-title">{{ t('settings.shareStockNotes') }}</span>
                  <span class="toggle-hint">{{ t('settings.shareStockNotesHint') }}</span>
                </span>
              </label>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- API Keys -->
    <section class="content-section">
      <div class="section-head">
        <h2 class="section-title">
          <Icon name="heroicons:key" class="w-5 h-5" />
          {{ t('settings.apiKeysTitle') }}
        </h2>
        <p class="section-desc">{{ t('settings.apiKeysDesc') }}</p>
      </div>

      <!-- Create API Key Form -->
      <form class="add-partner-form" @submit.prevent="createKey">
        <input
          v-model="label"
          type="text"
          :placeholder="t('settings.apiKeyLabelPlaceholder')"
          class="partner-input"
        >
        <select
          v-model="scope"
          class="scope-select"
          :aria-label="t('settings.apiKeyScope')"
        >
          <option value="DIARY_CREATE">{{ t('settings.apiKeyScopeDiaryCreate') }}</option>
          <option value="AGENT_WRITE">{{ t('settings.apiKeyScopeAgentWrite') }}</option>
        </select>
        <button
          type="submit"
          :disabled="isKeySubmitting || !label.trim()"
          class="action-btn-primary"
        >
          <Icon v-if="isKeySubmitting" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <Icon v-else name="heroicons:plus" class="w-4 h-4" />
          {{ isKeySubmitting ? t('common.loading') : t('settings.createApiKey') }}
        </button>
      </form>

      <!-- New Key Reveal -->
      <div v-if="latestRawKey" class="key-reveal">
        <div class="key-reveal-header">
          <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <p class="font-semibold">{{ t('settings.apiKeyCreatedTitle') }}</p>
        </div>
        <p class="key-reveal-hint">{{ t('settings.apiKeyCreatedHint') }}</p>
        <code class="key-reveal-code">{{ latestRawKey }}</code>
      </div>

      <!-- API Key List -->
      <div v-if="isKeysLoading" class="empty-state">
        <Icon name="heroicons:arrow-path" class="w-6 h-6 animate-spin empty-icon" />
        <p>{{ t('common.loading') }}</p>
      </div>

      <div v-else-if="keys.length === 0" class="empty-state">
        <Icon name="heroicons:key" class="w-12 h-12 empty-icon" />
        <h3 class="empty-title">{{ t('settings.noApiKeys') }}</h3>
        <p class="empty-desc">
          {{ t('partners.apiKeysEmptyHint') }}
        </p>
      </div>

      <div v-else class="key-list">
        <article
          v-for="key in keys"
          :key="key.id"
          class="key-card"
          :class="{ 'key-revoked': key.revokedAt }"
        >
          <div class="key-card-top">
            <div class="key-info">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="key-name">{{ key.label }}</h3>
                <span class="key-scope-badge">{{ key.scope }}</span>
                <span
                  v-if="key.revokedAt"
                  class="key-status-badge key-status-revoked"
                >
                  {{ t('settings.apiKeyRevoked') }}
                </span>
              </div>
              <p class="key-prefix">{{ key.keyPrefix }}...</p>
              <p class="key-meta">
                {{ t('settings.apiKeyLastUsed', { value: key.lastUsedAt ? formatDate(key.lastUsedAt) : t('settings.apiKeyNeverUsed') }) }}
              </p>
            </div>

            <button
              v-if="!key.revokedAt"
              type="button"
              class="action-btn-danger-sm"
              @click="revokeKey(key.id)"
            >
              <Icon name="heroicons:trash" class="w-4 h-4" />
              {{ t('settings.revokeApiKey') }}
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { PartnerLinkSummary, PartnerLinksResponse, ApiKeyCreateResponse, ApiKeysResponse, ApiKeySummary } from '~/types/partner'

const { t, locale } = useI18n()
const toast = useToast()

definePageMeta({
  middleware: 'auth'
})

useHead({
  title: `${t('partners.title')} - ${t('common.appName')}`
})

// ---- Partner State ----
const links = ref<PartnerLinkSummary[]>([])
const partnerEmail = ref('')
const isPartnersLoading = ref(true)
const isSubmitting = ref(false)

// ---- API Key State ----
const label = ref('')
const scope = ref<'DIARY_CREATE' | 'AGENT_WRITE'>('DIARY_CREATE')
const keys = ref<ApiKeySummary[]>([])
const latestRawKey = ref('')
const isKeysLoading = ref(true)
const isKeySubmitting = ref(false)

// ---- Computed Stats ----
const connectedCount = computed(() => links.value.filter(l => l.status === 'connected').length)
const pendingCount = computed(() => links.value.filter(l => l.status === 'pending_incoming').length)
const sharingCount = computed(() => links.value.filter(l => l.status === 'connected' && l.selfSharesDiaries).length)
const activeKeyCount = computed(() => keys.value.filter(k => !k.revokedAt).length)

// ---- Partner Methods ----
const loadLinks = async () => {
  try {
    const response = await $fetch<PartnerLinksResponse>('/api/partners')
    links.value = response.links
  } catch (error: any) {
    toast.error(error?.data?.statusMessage || t('settings.partnerLoadFailed'))
  } finally {
    isPartnersLoading.value = false
  }
}

onMounted(loadLinks)

const statusLabel = (link: PartnerLinkSummary) => {
  if (link.status === 'pending_incoming') return t('settings.partnerPendingIncoming')
  if (link.status === 'pending_outgoing') return t('settings.partnerPendingOutgoing')
  return t('settings.partnerConnected')
}

const statusClass = (link: PartnerLinkSummary) => {
  if (link.status === 'pending_incoming') return 'badge-pending-incoming'
  if (link.status === 'pending_outgoing') return 'badge-pending-outgoing'
  return 'badge-connected'
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
      body: { partnerEmail: partnerEmail.value },
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
    await $fetch(`/api/partners/${linkId}`, { method: 'DELETE' })
    toast.success(t('settings.partnerRemoved'))
  } catch (error: any) {
    links.value = previous
    toast.error(error?.data?.statusMessage || t('settings.partnerRemoveFailed'))
  }
}

// ---- API Key Methods ----
const loadKeys = async () => {
  try {
    const response = await $fetch<ApiKeysResponse>('/api/api-keys')
    keys.value = response.keys
  } catch (error: any) {
    toast.error(error?.data?.statusMessage || t('settings.apiKeyLoadFailed'))
  } finally {
    isKeysLoading.value = false
  }
}

onMounted(loadKeys)

const formatDate = (value: string) => new Date(value).toLocaleString(locale.value)

const createKey = async () => {
  if (!label.value.trim()) return

  try {
    isKeySubmitting.value = true
    const response = await $fetch<ApiKeyCreateResponse>('/api/api-keys', {
      method: 'POST',
      body: { label: label.value, scope: scope.value },
    })

    keys.value.unshift(response.key)
    latestRawKey.value = response.rawKey
    label.value = ''
    scope.value = 'DIARY_CREATE'
    toast.success(t('settings.apiKeyCreateSuccess'))
  } catch (error: any) {
    toast.error(error?.data?.statusMessage || t('settings.apiKeyCreateFailed'))
  } finally {
    isKeySubmitting.value = false
  }
}

const revokeKey = async (keyId: string) => {
  const previous = [...keys.value]
  keys.value = keys.value.map((key) => key.id === keyId
    ? { ...key, revokedAt: new Date().toISOString() }
    : key)

  try {
    await $fetch(`/api/api-keys/${keyId}`, { method: 'DELETE' })
    toast.success(t('settings.apiKeyRevokedSuccess'))
  } catch (error: any) {
    keys.value = previous
    toast.error(error?.data?.statusMessage || t('settings.apiKeyRevokeFailed'))
  }
}
</script>

<style scoped>
/* ---- Page Layout ---- */
.partners-page {
  padding-bottom: 5rem;
}

/* ---- Ledger Hero ---- */
.ledger-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 2rem 1.5rem 1.5rem;
  max-width: 75rem;
  margin: 0 auto;
}

.hero-copy {
  flex: 1;
  min-width: 0;
}

.kicker {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--color-text-muted, #A19687);
  margin-bottom: 0.25rem;
}

.hero-title {
  font-family: var(--font-display, 'Source Sans 3', sans-serif);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text, #191714);
  line-height: 1.15;
  letter-spacing: -0.02em;
}

:root.dark .hero-title {
  color: var(--color-text, #F3EEE6);
}

.hero-summary {
  margin-top: 0.5rem;
  font-size: 0.9375rem;
  color: var(--color-text-soft, #4E463E);
  line-height: 1.55;
  max-width: 36rem;
}

:root.dark .hero-summary {
  color: var(--color-text-soft, #B7AEA2);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

/* ---- Stats Grid ---- */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  max-width: 75rem;
  margin: 0 auto 1.5rem;
  padding: 0 1.5rem;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem 0.75rem;
  border-radius: 1rem;
  background: var(--color-surface, #F6F1E8);
  border: 1px solid var(--color-border-soft, #D7CCBC);
  text-align: center;
}

:root.dark .stat-card {
  background: var(--color-surface, #161C20);
  border-color: var(--color-border, #2A343B);
}

.stat-icon {
  opacity: 0.7;
  margin-bottom: 0.125rem;
}

.stat-connected .stat-icon { color: #1C6B5C; }
.stat-pending .stat-icon { color: #A56A18; }
.stat-sharing .stat-icon { color: #2F5E88; }
.stat-apikeys .stat-icon { color: #17324D; }

.stat-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.5rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text, #191714);
  line-height: 1;
}

:root.dark .stat-value {
  color: var(--color-text, #F3EEE6);
}

.stat-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, #A19687);
}

/* ---- Content Sections ---- */
.content-section {
  max-width: 75rem;
  margin: 0 auto 1.5rem;
  padding: 1.5rem;
  background: var(--color-surface, #F6F1E8);
  border: 1px solid var(--color-border-soft, #D7CCBC);
  border-radius: 1.25rem;
}

:root.dark .content-section {
  background: var(--color-surface-raised, #1C2328);
  border-color: var(--color-border, #2A343B);
}

.section-head {
  margin-bottom: 1.25rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display, 'Source Sans 3', sans-serif);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text, #191714);
}

:root.dark .section-title {
  color: var(--color-text, #F3EEE6);
}

.section-desc {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: var(--color-text-soft, #4E463E);
  line-height: 1.5;
}

:root.dark .section-desc {
  color: var(--color-text-soft, #B7AEA2);
}

/* ---- Add Form ---- */
.add-partner-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.partner-input {
  flex: 1;
  min-width: 200px;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--color-border-soft, #D7CCBC);
  border-radius: 0.75rem;
  background: var(--color-surface-0, #fff);
  font-size: 0.875rem;
  color: var(--color-text, #191714);
  outline: none;
  transition: border-color 120ms;
}

.partner-input:focus {
  border-color: #17324D;
  box-shadow: 0 0 0 2px rgba(23, 50, 77, 0.12);
}

:root.dark .partner-input {
  background: var(--color-surface, #161C20);
  border-color: var(--color-border, #2A343B);
  color: var(--color-text, #F3EEE6);
}

:root.dark .partner-input:focus {
  border-color: #4A7CAA;
  box-shadow: 0 0 0 2px rgba(74, 124, 170, 0.2);
}

.scope-select {
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--color-border-soft, #D7CCBC);
  border-radius: 0.75rem;
  background: var(--color-surface-0, #fff);
  font-size: 0.875rem;
  color: var(--color-text, #191714);
  outline: none;
  cursor: pointer;
}

:root.dark .scope-select {
  background: var(--color-surface, #161C20);
  border-color: var(--color-border, #2A343B);
  color: var(--color-text, #F3EEE6);
}

/* ---- Action Buttons ---- */
.action-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1.125rem;
  background: #17324D;
  color: #fff;
  border: none;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms;
  white-space: nowrap;
}

.action-btn-primary:hover {
  background: #1E4062;
}

.action-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn-muted {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--color-border-soft, #D7CCBC);
  border-radius: 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-soft, #4E463E);
  background: transparent;
  text-decoration: none;
  transition: border-color 120ms, color 120ms;
}

.action-btn-muted:hover {
  border-color: #17324D;
  color: #17324D;
}

.action-btn-sm {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-border-soft, #D7CCBC);
  border-radius: 0.625rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #17324D;
  background: transparent;
  text-decoration: none;
  transition: background 120ms;
}

.action-btn-sm:hover {
  background: rgba(23, 50, 77, 0.06);
}

.action-btn-danger-sm {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid #e0c0b8;
  border-radius: 0.625rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #B33A2F;
  background: transparent;
  cursor: pointer;
  transition: background 120ms;
}

.action-btn-danger-sm:hover {
  background: rgba(179, 58, 47, 0.06);
}

:root.dark .action-btn-danger-sm {
  border-color: rgba(179, 58, 47, 0.3);
  color: #E06050;
}

:root.dark .action-btn-danger-sm:hover {
  background: rgba(179, 58, 47, 0.1);
}

/* ---- Empty State ---- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
}

.empty-icon {
  color: var(--color-text-muted, #A19687);
  margin-bottom: 0.75rem;
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text, #191714);
  margin-bottom: 0.25rem;
}

:root.dark .empty-title {
  color: var(--color-text, #F3EEE6);
}

.empty-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted, #A19687);
  max-width: 24rem;
  line-height: 1.5;
}

/* ---- Partner List ---- */
.partner-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.partner-card {
  border: 1px solid var(--color-border-soft, #D7CCBC);
  border-radius: 1rem;
  overflow: hidden;
}

.partner-card.partner-connected {
  border-left: 3px solid #1C6B5C;
}

.partner-card.partner-pending {
  border-left: 3px solid #A56A18;
}

:root.dark .partner-card.partner-connected {
  border-left-color: #3A9A85;
}

:root.dark .partner-card.partner-pending {
  border-left-color: #D49A3D;
}

.partner-card-top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
}

.partner-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.partner-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background: var(--color-surface-0, #fff);
  border: 1px solid var(--color-border-soft, #D7CCBC);
  flex-shrink: 0;
  color: var(--color-text-muted, #A19687);
}

:root.dark .partner-avatar {
  background: var(--color-surface, #161C20);
  border-color: var(--color-border, #2A343B);
}

.partner-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text, #191714);
}

:root.dark .partner-name {
  color: var(--color-text, #F3EEE6);
}

.partner-email {
  margin-top: 0.125rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #A19687);
}

.partner-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.badge-connected {
  background: rgba(28, 107, 92, 0.1);
  color: #1C6B5C;
}

.badge-pending-incoming {
  background: rgba(165, 106, 24, 0.1);
  color: #A56A18;
}

.badge-pending-outgoing {
  background: rgba(79, 70, 62, 0.1);
  color: #4E463E;
}

:root.dark .badge-connected {
  background: rgba(58, 154, 133, 0.15);
  color: #3A9A85;
}

:root.dark .badge-pending-incoming {
  background: rgba(212, 154, 61, 0.15);
  color: #D49A3D;
}

:root.dark .badge-pending-outgoing {
  background: rgba(183, 174, 162, 0.15);
  color: #B7AEA2;
}

.partner-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}

/* ---- Partner Card Bottom (Sharing) ---- */
.partner-card-bottom {
  border-top: 1px solid var(--color-border-soft, #D7CCBC);
  padding: 1rem 1.25rem;
  background: var(--color-surface-0, #fafaf5);
}

:root.dark .partner-card-bottom {
  background: rgba(22, 28, 32, 0.4);
  border-top-color: var(--color-border, #2A343B);
}

.sharing-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.sharing-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.pill-on {
  background: rgba(28, 107, 92, 0.08);
  color: #1C6B5C;
  border: 1px solid rgba(28, 107, 92, 0.2);
}

.pill-off {
  background: rgba(161, 150, 135, 0.08);
  color: #A19687;
  border: 1px solid rgba(161, 150, 135, 0.15);
}

:root.dark .pill-on {
  background: rgba(58, 154, 133, 0.12);
  color: #3A9A85;
  border-color: rgba(58, 154, 133, 0.25);
}

:root.dark .pill-off {
  background: rgba(183, 174, 162, 0.08);
  color: #B7AEA2;
  border-color: rgba(183, 174, 162, 0.15);
}

.sharing-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toggle-row {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  cursor: pointer;
}

.toggle-input {
  margin-top: 0.1875rem;
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  border: 1.5px solid var(--color-border-soft, #D7CCBC);
  cursor: pointer;
  accent-color: #17324D;
  flex-shrink: 0;
}

.toggle-title {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text, #191714);
}

:root.dark .toggle-title {
  color: var(--color-text, #F3EEE6);
}

.toggle-hint {
  display: block;
  margin-top: 0.125rem;
  font-size: 0.75rem;
  color: var(--color-text-muted, #A19687);
  line-height: 1.4;
}

/* ---- Key Reveal ---- */
.key-reveal {
  margin-bottom: 1.25rem;
  padding: 1rem 1.25rem;
  border-radius: 1rem;
  background: rgba(165, 106, 24, 0.06);
  border: 1px solid rgba(165, 106, 24, 0.2);
}

:root.dark .key-reveal {
  background: rgba(212, 154, 61, 0.08);
  border-color: rgba(212, 154, 61, 0.2);
}

.key-reveal-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}

.key-reveal-header p {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text, #191714);
}

:root.dark .key-reveal-header p {
  color: var(--color-text, #F3EEE6);
}

.key-reveal-hint {
  font-size: 0.8125rem;
  color: var(--color-text-soft, #4E463E);
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

:root.dark .key-reveal-hint {
  color: var(--color-text-soft, #B7AEA2);
}

.key-reveal-code {
  display: block;
  padding: 0.75rem 1rem;
  background: #0F1316;
  border-radius: 0.625rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8125rem;
  color: #3A9A85;
  word-break: break-all;
  line-height: 1.5;
}

/* ---- Key List ---- */
.key-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.key-card {
  border: 1px solid var(--color-border-soft, #D7CCBC);
  border-radius: 0.875rem;
  padding: 1rem 1.25rem;
}

.key-card.key-revoked {
  opacity: 0.55;
}

:root.dark .key-card {
  border-color: var(--color-border, #2A343B);
}

.key-card-top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.key-info {
  min-width: 0;
}

.key-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text, #191714);
}

:root.dark .key-name {
  color: var(--color-text, #F3EEE6);
}

.key-scope-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: rgba(23, 50, 77, 0.08);
  color: #17324D;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

:root.dark .key-scope-badge {
  background: rgba(74, 124, 170, 0.12);
  color: #7EB4D5;
}

.key-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.key-status-revoked {
  background: rgba(179, 58, 47, 0.08);
  color: #B33A2F;
}

:root.dark .key-status-revoked {
  background: rgba(224, 96, 80, 0.12);
  color: #E06050;
}

.key-prefix {
  margin-top: 0.25rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #A19687);
}

.key-meta {
  margin-top: 0.125rem;
  font-size: 0.75rem;
  color: var(--color-text-muted, #A19687);
}
</style>
