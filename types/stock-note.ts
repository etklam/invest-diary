import type {
  StockNoteResponse as CanonicalStockNoteResponse,
  StockNoteListItem as CanonicalStockNoteListItem,
  StockNoteListResponse as CanonicalStockNoteListResponse,
} from '~/lib/contracts/stocks'

export type StockNoteCreatedVia = 'USER' | 'AGENT'
export type StockNoteOwnership = 'self' | 'partner'
export type StockNoteAuthorKind = 'user' | 'agent'

/** Raw note shape returned by the stock-note API. */
export type StockNoteResponse = CanonicalStockNoteResponse
export type StockNoteListItem = CanonicalStockNoteListItem
export type StockNotesResponse = CanonicalStockNoteListResponse

/** Client-facing contract shared by the page, list, and item components. */
export type StockNoteView = Omit<StockNoteResponse, 'createdVia' | 'createdByLabel' | 'isOwnedByViewer'> & {
  ownership: StockNoteOwnership
  authorKind: StockNoteAuthorKind
  authorLabel: string | null
  canEdit: boolean
}

export interface StockNotesViewResponse extends Omit<StockNotesResponse, 'data'> {
  data: StockNoteView[]
}

export interface StockNoteDraft {
  title: string
  content: string
  date: string
}
