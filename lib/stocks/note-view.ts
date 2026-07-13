import type {
  PartnerLinkSummary,
} from '~/types/partner'
import type {
  StockNoteResponse,
  StockNoteView,
  StockNotesResponse,
  StockNotesViewResponse,
} from '~/types/stock-note'

/**
 * Converts the backwards-compatible API response into the one client contract
 * consumed by stock-note UI components.
 */
export function toStockNoteView(note: StockNoteResponse): StockNoteView {
  const ownership = note.isOwnedByViewer === false ? 'partner' : 'self'
  const authorKind = note.createdVia === 'AGENT' ? 'agent' : 'user'

  return {
    id: note.id,
    symbol: note.symbol,
    name: note.name,
    title: note.title,
    content: note.content,
    date: note.date,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    ownership,
    authorKind,
    authorLabel: note.createdByLabel,
    canEdit: ownership === 'self' && authorKind === 'user',
  }
}

export function toStockNotesView(response: StockNotesResponse): StockNotesViewResponse {
  return {
    ...response,
    notes: response.notes.map(toStockNoteView),
  }
}

export function canDisplayPartnerStockNotes(
  link: Pick<PartnerLinkSummary, 'status' | 'partnerSharesStockNotes'>,
) {
  return link.status === 'connected' && link.partnerSharesStockNotes
}
