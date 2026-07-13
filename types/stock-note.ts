export type StockNoteCreatedVia = 'USER' | 'AGENT'
export type StockNoteOwnership = 'self' | 'partner'
export type StockNoteAuthorKind = 'user' | 'agent'

/** Raw note shape returned by the stock-note API. */
export interface StockNoteResponse {
  id: string
  symbol: string
  name: string | null
  title: string
  content: string
  date: string
  createdVia: StockNoteCreatedVia
  createdByLabel: string | null
  createdAt: string
  updatedAt: string
  /** Present on list responses; omitted by create/update responses for compatibility. */
  isOwnedByViewer?: boolean
}

export interface StockNotesResponse {
  notes: StockNoteResponse[]
  total: number
  page: number
  limit: number
}

/** Client-facing contract shared by the page, list, and item components. */
export type StockNoteView = Omit<StockNoteResponse, 'createdVia' | 'createdByLabel' | 'isOwnedByViewer'> & {
  ownership: StockNoteOwnership
  authorKind: StockNoteAuthorKind
  authorLabel: string | null
  canEdit: boolean
}

export interface StockNotesViewResponse extends Omit<StockNotesResponse, 'notes'> {
  notes: StockNoteView[]
}

export interface StockNoteDraft {
  title: string
  content: string
  date: string
}
