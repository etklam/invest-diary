import type { QuickNoteTemplateKind } from '~/types/quicknote'

type Translate = (key: string, params?: Record<string, unknown>) => string

export type QuickNoteSaveErrorSeverity = 'error' | 'warning'

export interface QuickNoteSaveErrorToast {
  message: string
  severity: QuickNoteSaveErrorSeverity
}

export interface QuickNoteModalTemplateOption {
  kind: QuickNoteTemplateKind
  label: string
  description: string
  icon: string
  iconClass: string
}

export function createQuickNoteModalTemplates(t: Translate): QuickNoteModalTemplateOption[] {
  return [
    {
      kind: 'blank',
      label: t('quickDiary.templates.blank'),
      description: t('quickDiary.templates.blankDesc'),
      icon: 'heroicons:pencil-square-solid',
      iconClass: 'bg-[color:var(--color-primary-active)]',
    },
    {
      kind: 'trading',
      label: t('quickDiary.templates.trading'),
      description: t('quickDiary.templates.tradingDesc'),
      icon: 'heroicons:currency-dollar-solid',
      iconClass: 'bg-[color:var(--color-accent)]',
    },
    {
      kind: 'reflection',
      label: t('quickDiary.templates.reflection'),
      description: t('quickDiary.templates.reflectionDesc'),
      icon: 'heroicons:light-bulb-solid',
      iconClass: 'bg-[color:var(--color-secondary)]',
    },
    {
      kind: 'observation',
      label: t('quickDiary.templates.observation'),
      description: t('quickDiary.templates.observationDesc'),
      icon: 'heroicons:eye-solid',
      iconClass: 'bg-[color:var(--color-primary)]',
    },
  ]
}

export function resolveQuickNoteSaveErrorMessage(error: any, t: Translate): string {
  if (error?.message === 'CONTENT_REQUIRED' || error?.message === 'TITLE_REQUIRED') {
    return t('quickDiary.fillRequired')
  }

  if (error?.statusCode === 409 || error?.data?.code === 'DIARY_ALREADY_EXISTS') {
    return t('quickDiary.errors.diaryExists')
  }

  return t('quickDiary.errors.createFailedPrefix') + (error?.data?.statusMessage || error?.message || 'Unknown error')
}

export function resolveQuickNoteSaveErrorToast(
  error: any,
  t: Translate,
  severity: QuickNoteSaveErrorSeverity = 'error',
): QuickNoteSaveErrorToast {
  return {
    message: resolveQuickNoteSaveErrorMessage(error, t),
    severity,
  }
}

export function showQuickNoteSaveErrorToast(
  toast: { error: (message: string) => void; warning: (message: string) => void },
  error: any,
  t: Translate,
  severity: QuickNoteSaveErrorSeverity = 'error',
) {
  const resolved = resolveQuickNoteSaveErrorToast(error, t, severity)
  toast[resolved.severity](resolved.message)
}
