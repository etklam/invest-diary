import type { QuickNoteTemplateKind } from '~/types/quicknote'

type Translate = (key: string) => string

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
      kind: 'trading',
      label: t('quickDiary.templates.trading'),
      description: t('quickDiary.templates.tradingDesc'),
      icon: 'heroicons:currency-dollar-solid',
      iconClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    },
    {
      kind: 'reflection',
      label: t('quickDiary.templates.reflection'),
      description: t('quickDiary.templates.reflectionDesc'),
      icon: 'heroicons:light-bulb-solid',
      iconClass: 'bg-gradient-to-br from-purple-400 to-purple-600',
    },
    {
      kind: 'observation',
      label: t('quickDiary.templates.observation'),
      description: t('quickDiary.templates.observationDesc'),
      icon: 'heroicons:eye-solid',
      iconClass: 'bg-gradient-to-br from-blue-400 to-blue-600',
    },
  ]
}

export function resolveQuickNoteSaveErrorMessage(error: any, t: Translate): string {
  if (error?.message === 'CONTENT_REQUIRED' || error?.message === 'TITLE_REQUIRED') {
    return t('quickDiary.fillRequired')
  }

  return '建立失敗：' + (error?.data?.statusMessage || error?.message || 'Unknown error')
}
