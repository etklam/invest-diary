<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-[100] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="research-capture-title"
      @keydown="handleDialogKeydown"
    >
      <div class="flex min-h-[100dvh] items-end justify-center sm:items-center sm:p-6">
        <div class="fixed inset-0 bg-black/55" aria-hidden="true" @click="close" />

        <div
          ref="dialogPanel"
          class="relative flex max-h-[calc(100dvh-16px)] w-full min-w-0 flex-col overflow-y-auto rounded-t-dt-lg border border-dt-border bg-dt-surface shadow-dt-lg sm:max-h-[calc(100dvh-48px)] sm:max-w-xl sm:rounded-dt-lg"
          tabindex="-1"
        >
          <header class="flex min-h-16 items-center justify-between gap-3 border-b border-dt-border px-4 py-3 sm:px-6">
            <h1 id="research-capture-title" class="min-w-0 font-display text-xl font-semibold tracking-tight text-dt-text">
              {{ t('researchCapture.title') }}
            </h1>
            <button
              type="button"
              class="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-dt-sm text-2xl leading-none text-dt-text-muted transition-colors hover:bg-dt-surface-strong hover:text-dt-text focus:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/40"
              :aria-label="t('common.close')"
              :disabled="isPending"
              @click="close"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <LedgerCard class="rounded-none border-0 p-4 shadow-none sm:p-6">
            <template v-if="captureContext">
              <div class="mb-5 min-w-0 border-l-2 border-dt-primary pl-3">
                <p class="text-xs font-semibold uppercase tracking-[0.12em] text-dt-text-muted">
                  {{ t('researchCapture.source') }}
                </p>
                <p class="mt-1 break-words text-sm font-medium text-dt-text">
                  {{ captureContext.sourceLabel }}
                </p>
              </div>

              <form class="space-y-5" novalidate @submit.prevent="submit">
                <div>
                  <label for="research-capture-insight" class="block text-sm font-semibold text-dt-text">
                    {{ t('researchCapture.insight') }}
                  </label>
                  <textarea
                    id="research-capture-insight"
                    ref="insightInput"
                    v-model="insight"
                    rows="5"
                    required
                    :aria-invalid="insightError ? 'true' : 'false'"
                    :aria-describedby="insightError ? 'research-capture-insight-error' : undefined"
                    class="mt-1.5 block min-h-32 w-full resize-y rounded-dt-sm border border-dt-border bg-dt-surface-strong p-3 text-sm leading-relaxed text-dt-text outline-none transition-colors placeholder:text-dt-text-soft focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20"
                    :placeholder="t('researchCapture.insightPlaceholder')"
                    @input="insightError = false"
                  />
                  <p v-if="insightError" id="research-capture-insight-error" class="mt-1.5 text-sm text-dt-danger" role="alert">
                    {{ t('researchCapture.insightRequired') }}
                  </p>
                </div>

                <fieldset>
                  <legend class="text-sm font-semibold text-dt-text">
                    {{ t('researchCapture.saveTo') }}
                  </legend>
                  <div class="mt-2 grid gap-2">
                    <label
                      v-for="option in destinations"
                      :key="option.value"
                      class="flex min-h-11 cursor-pointer items-center gap-3 rounded-dt-sm border border-dt-border px-3 py-2.5 text-sm text-dt-text transition-colors hover:border-dt-primary has-[:focus-visible]:border-dt-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-dt-primary/20"
                    >
                      <input
                        v-model="destination"
                        class="h-4 w-4 accent-dt-primary"
                        type="radio"
                        name="research-capture-destination"
                        :value="option.value"
                        @change="companyError = false"
                      />
                      <span>{{ option.label }}</span>
                    </label>
                  </div>
                </fieldset>

                <div v-if="destination === 'companyEvidence'">
                  <label for="research-capture-company" class="block text-sm font-semibold text-dt-text">
                    {{ t('researchCapture.selectCompany') }}
                  </label>
                  <input
                    id="research-capture-company"
                    v-model="symbol"
                    type="text"
                    autocomplete="off"
                    required
                    :aria-invalid="companyError ? 'true' : 'false'"
                    :aria-describedby="companyError ? 'research-capture-company-error' : undefined"
                    class="mt-1.5 block min-h-11 w-full rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 text-sm font-mono uppercase text-dt-text outline-none transition-colors placeholder:font-sans placeholder:normal-case placeholder:text-dt-text-soft focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20"
                    :placeholder="t('researchCapture.companyPlaceholder')"
                    @input="companyError = false"
                  />
                  <p v-if="companyError" id="research-capture-company-error" class="mt-1.5 text-sm text-dt-danger" role="alert">
                    {{ t('researchCapture.companyRequired') }}
                  </p>
                </div>

                <div
                  v-if="saveError || savedSymbol"
                  class="space-y-2"
                  aria-live="polite"
                >
                  <p v-if="saveError" class="text-sm text-dt-danger" role="alert">
                    {{ saveError }}
                  </p>
                  <div v-if="savedSymbol" class="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="success">
                      {{ t('researchCapture.evidenceSaved') }}
                    </StatusBadge>
                    <a
                      class="min-h-11 inline-flex items-center rounded-dt-sm px-2 text-sm font-semibold text-dt-primary underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current focus:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/40"
                      :href="`/stocks/${encodeURIComponent(savedSymbol)}`"
                    >
                      {{ t('researchCapture.viewCompany') }}
                    </a>
                  </div>
                </div>

                <footer class="flex flex-col-reverse gap-2 border-t border-dt-border pt-4 sm:flex-row sm:justify-end">
                  <BaseButton variant="secondary" type="button" :disabled="isPending" @click="close">
                    {{ t('researchCapture.cancel') }}
                  </BaseButton>
                  <BaseButton
                    variant="primary"
                    type="submit"
                    :disabled="isPending || Boolean(savedSymbol)"
                  >
                    {{ isPending ? t('researchCapture.saving') : destination === 'quickDiary' ? t('researchCapture.continue') : t('researchCapture.save') }}
                  </BaseButton>
                </footer>
              </form>
            </template>
          </LedgerCard>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from '~/components/BaseButton.vue'
import LedgerCard from '~/components/LedgerCard.vue'
import StatusBadge from '~/components/StatusBadge.vue'
import type { ResearchCaptureController, ResearchCaptureDestination } from '~/composables/useResearchCapture'

const props = defineProps<{
  capture: ResearchCaptureController
}>()

const { t } = useI18n()
const dialogPanel = ref<HTMLElement | null>(null)
const insightInput = ref<HTMLTextAreaElement | null>(null)
const insight = ref('')
const symbol = ref('')
const destination = ref<ResearchCaptureDestination>('quickDiary')
const insightError = ref(false)
const companyError = ref(false)
const previousActiveElement = ref<HTMLElement | null>(null)

const destinations = computed(() => [
  { value: 'quickDiary' as const, label: t('researchCapture.quickDiary') },
  ...(captureContext.value?.allowCompanyEvidence === false
    ? []
    : [{ value: 'companyEvidence' as const, label: t('researchCapture.companyEvidence') }]),
])
const isVisible = computed(() => props.capture.isOpen.value && props.capture.canCapture.value)
const captureContext = computed(() => props.capture.context.value)
const isPending = computed(() => props.capture.pending.value)
const saveError = computed(() => props.capture.saveError.value)
const savedSymbol = computed(() => props.capture.savedSymbol.value)

watch(captureContext, (nextContext) => {
  if (!nextContext) return
  insight.value = nextContext.suggestedInsight
  symbol.value = nextContext.symbolPrefill ?? ''
  destination.value = 'quickDiary'
  insightError.value = false
  companyError.value = false
}, { immediate: true })

watch(isVisible, async (visible) => {
  if (typeof document === 'undefined') return

  if (visible) {
    previousActiveElement.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.documentElement.style.overflow = 'hidden'
    await nextTick()
    insightInput.value?.focus()
    return
  }

  document.documentElement.style.overflow = ''
  previousActiveElement.value?.focus()
  previousActiveElement.value = null
}, { flush: 'post', immediate: true })

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.documentElement.style.overflow = ''
  previousActiveElement.value?.focus()
})

function close() {
  props.capture.close()
}

async function submit() {
  if (isPending.value || savedSymbol.value) return

  const trimmedInsight = insight.value.trim()
  const normalizedSymbol = symbol.value.trim().toUpperCase()
  insightError.value = !trimmedInsight
  companyError.value = destination.value === 'companyEvidence' && !normalizedSymbol
  if (insightError.value || companyError.value) return

  if (destination.value === 'quickDiary') {
    props.capture.continueToQuickDiary(trimmedInsight, normalizedSymbol)
    return
  }

  await props.capture.saveEvidence(trimmedInsight, normalizedSymbol)
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented) return
  if (event.key === 'Escape') {
    event.preventDefault()
    if (!isPending.value) close()
    return
  }
  if (event.key !== 'Tab' || !dialogPanel.value) return

  const focusable = Array.from(dialogPanel.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  ))
  if (!focusable.length) return

  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>
