import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useAppShell } from '~/composables/useAppShell'
import { useAuth } from '~/composables/useAuth'
import type { QuickDiaryContext } from '~/types/quicknote'
import type { StockTimelineSourceType } from '~/lib/contracts/stocks/timeline-source'
import { formatUserDateTime } from '~/lib/dates'
import { resolveUserTimezone } from '~/lib/dates/user-tz'

export type ResearchCaptureSourceType = StockTimelineSourceType

export interface ResearchCaptureMetadata {
  sourceType: ResearchCaptureSourceType
  sourceTitle?: string
  sourceUrl?: string
  occurredAt: string
  metadataJson?: string
}

export interface ResearchCaptureContext {
  sourceLabel: string
  suggestedInsight: string
  metadata: ResearchCaptureMetadata
  symbolPrefill?: string
  allowCompanyEvidence?: boolean
}

export type ResearchCaptureDestination = 'quickDiary' | 'companyEvidence'

export interface ResearchCaptureController {
  canCapture: ComputedRef<boolean>
  isOpen: Ref<boolean>
  context: Ref<ResearchCaptureContext | null>
  pending: Ref<boolean>
  saveError: Ref<string | null>
  savedSymbol: Ref<string | null>
  open: (context: ResearchCaptureContext) => boolean
  close: () => void
  continueToQuickDiary: (insight: string, symbol?: string) => boolean
  saveEvidence: (insight: string, symbol: string) => Promise<boolean>
}

function createIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `research-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatContextDate(value: string, timezone: string, locale: string): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return formatUserDateTime(date, {
    timezone,
    locale,
    format: { year: 'numeric', month: 'short', day: 'numeric' },
  })
}

export const useResearchCapture = (): ResearchCaptureController => {
  const { isAuthenticated, user } = useAuth()
  const { openQuickDiary } = useAppShell()
  const { t, locale } = useI18n()
  const toast = useToast()

  const isOpen = ref(false)
  const context = ref<ResearchCaptureContext | null>(null)
  const pending = ref(false)
  const saveError = ref<string | null>(null)
  const savedSymbol = ref<string | null>(null)
  const idempotencyKey = ref<string | null>(null)
  const canCapture = computed(() => isAuthenticated.value)

  const open = (nextContext: ResearchCaptureContext): boolean => {
    if (!isAuthenticated.value) return false

    context.value = nextContext
    saveError.value = null
    savedSymbol.value = null
    idempotencyKey.value = createIdempotencyKey()
    isOpen.value = true
    return true
  }

  const close = () => {
    if (pending.value) return

    isOpen.value = false
    context.value = null
    saveError.value = null
    savedSymbol.value = null
    idempotencyKey.value = null
  }

  const buildQuickDiaryContent = (insight: string, currentContext: ResearchCaptureContext): string => {
    const lines = [`${t('researchCapture.context.source')}: ${currentContext.sourceLabel}`]
    const title = currentContext.metadata.sourceTitle
    const asOf = formatContextDate(
      currentContext.metadata.occurredAt,
      resolveUserTimezone(user.value),
      locale.value || 'en',
    )

    if (title && title !== currentContext.sourceLabel) {
      lines.push(`${t('researchCapture.context.title')}: ${title}`)
    }
    if (asOf) lines.push(`${t('researchCapture.context.asOf')}: ${asOf}`)

    return [insight.trim(), lines.join('\n')].filter(Boolean).join('\n\n')
  }

  const continueToQuickDiary = (insight: string, symbol = ''): boolean => {
    if (!isAuthenticated.value || pending.value) return false
    const currentContext = context.value
    const trimmedInsight = insight.trim()
    if (!currentContext || !trimmedInsight) return false

    const quickDiaryContext = {
      source: 'research',
      content: buildQuickDiaryContent(trimmedInsight, currentContext),
      stockSymbols: symbol.trim() ? [symbol.trim().toUpperCase()] : [],
    } as unknown as QuickDiaryContext

    openQuickDiary(quickDiaryContext)
    close()
    return true
  }

  const saveEvidence = async (insight: string, symbol: string): Promise<boolean> => {
    if (!isAuthenticated.value || pending.value) return false

    const currentContext = context.value
    const trimmedInsight = insight.trim()
    const normalizedSymbol = symbol.trim().toUpperCase()
    if (!currentContext || currentContext.allowCompanyEvidence === false || !trimmedInsight || !normalizedSymbol) return false

    pending.value = true
    saveError.value = null
    try {
      const endpoint: string = `/api/stocks/${encodeURIComponent(normalizedSymbol)}/evidence`
      await $fetch(endpoint, {
        method: 'POST',
        body: {
          summary: trimmedInsight,
          sourceType: currentContext.metadata.sourceType,
          sourceTitle: currentContext.metadata.sourceTitle ?? currentContext.sourceLabel,
          sourceUrl: currentContext.metadata.sourceUrl,
          occurredAt: currentContext.metadata.occurredAt,
          idempotencyKey: idempotencyKey.value,
          metadataJson: currentContext.metadata.metadataJson,
        },
      })
      savedSymbol.value = normalizedSymbol
      toast.success(t('researchCapture.evidenceSaved'))
      return true
    } catch {
      saveError.value = t('researchCapture.saveFailed')
      toast.error(saveError.value)
      return false
    } finally {
      pending.value = false
    }
  }

  return {
    canCapture,
    isOpen,
    context,
    pending,
    saveError,
    savedSymbol,
    open,
    close,
    continueToQuickDiary,
    saveEvidence,
  }
}
