export type QuickNoteTemplateKind = 'blank' | 'trading' | 'reflection' | 'observation'
export type QuickNoteReminderKey = 'reminder1'
export type QuickNoteQuickReminderPreset = 'tomorrow' | 'nextWeek' | 'nextMonth'

export interface QuickNoteReminders {
  reminder1: string | null
}

export interface QuickNoteTemplateData {
  tradingType?: string
  symbols?: string
  marketMood?: string
  note?: string
  marketCondition?: string
  rating?: number
  noRashTrading?: boolean
  goodPoints?: string
  improvePoints?: string
  topic?: string
  observationType?: string
  observationContent?: string
  action?: string
}

export interface QuickNoteComposerState {
  date: string
  templateKind: QuickNoteTemplateKind
  title: string
  content: string
  tags: string[]
  reminders: QuickNoteReminders
  templateData: QuickNoteTemplateData
  titleTouched: boolean
  contentTouched: boolean
}

export function createEmptyQuickNoteTemplateData(): QuickNoteTemplateData {
  return {
    tradingType: '',
    symbols: '',
    marketMood: '',
    note: '',
    marketCondition: '',
    rating: 0,
    noRashTrading: false,
    goodPoints: '',
    improvePoints: '',
    topic: '',
    observationType: '',
    observationContent: '',
    action: '',
  }
}
