import { describe, expect, it } from 'vitest'
import { canDisplayPartnerStockNotes, toStockNoteView, toStockNotesView } from '~/lib/stocks/note-view'
import type { StockNoteResponse } from '~/types/stock-note'

const makeResponse = (overrides: Partial<StockNoteResponse> = {}): StockNoteResponse => ({
  id: 'note-1',
  symbol: 'AAPL',
  name: 'Apple Inc.',
  title: 'Quarterly thesis',
  content: 'Earnings remain strong.',
  date: '2026-05-18T00:00:00.000Z',
  createdVia: 'USER',
  createdByLabel: null,
  createdAt: '2026-05-18T12:00:00.000Z',
  updatedAt: '2026-05-18T12:00:00.000Z',
  ...overrides,
})

describe('stock note view projection', () => {
  it('projects a viewer-authored human note as self and editable', () => {
    expect(toStockNoteView(makeResponse({ isOwnedByViewer: true }))).toMatchObject({
      ownership: 'self',
      authorKind: 'user',
      canEdit: true,
      authorLabel: null,
    })
  })

  it('projects a viewer-authored agent note as self and non-editable', () => {
    expect(toStockNoteView(makeResponse({
      createdVia: 'AGENT',
      createdByLabel: 'OpenClaw',
      isOwnedByViewer: true,
    }))).toMatchObject({
      ownership: 'self',
      authorKind: 'agent',
      authorLabel: 'OpenClaw',
      canEdit: false,
    })
  })

  it('projects a partner-authored human note as user, not agent, and non-editable', () => {
    expect(toStockNoteView(makeResponse({
      createdVia: 'USER',
      createdByLabel: 'Ana',
      isOwnedByViewer: false,
    }))).toMatchObject({
      ownership: 'partner',
      authorKind: 'user',
      authorLabel: 'Ana',
      canEdit: false,
    })
  })

  it('projects a partner-authored agent note as agent and non-editable', () => {
    expect(toStockNoteView(makeResponse({
      createdVia: 'AGENT',
      isOwnedByViewer: false,
    }))).toMatchObject({
      ownership: 'partner',
      authorKind: 'agent',
      canEdit: false,
    })
  })

  it('maps the complete paginated response while keeping the pagination contract', () => {
    const response = {
      data: [{ ...makeResponse(), isOwnedByViewer: true }],
      pagination: { total: 1, totalPages: 1, page: 2, limit: 20 },
    }

    expect(toStockNotesView(response)).toEqual({
      ...response,
      data: [expect.objectContaining({ ownership: 'self', authorKind: 'user' })],
    })
  })

  it('allows partner notes only for connected links with sharing enabled', () => {
    expect(canDisplayPartnerStockNotes({ status: 'connected', partnerSharesStockNotes: true })).toBe(true)
    expect(canDisplayPartnerStockNotes({ status: 'connected', partnerSharesStockNotes: false })).toBe(false)
    expect(canDisplayPartnerStockNotes({ status: 'pending_incoming', partnerSharesStockNotes: true })).toBe(false)
    expect(canDisplayPartnerStockNotes({ status: 'pending_outgoing', partnerSharesStockNotes: true })).toBe(false)
  })
})
