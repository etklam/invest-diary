import { describe, expect, it } from 'vitest'
import {
  getPartnerLinkStatus,
  getPartnerSide,
  getSharingUpdateData,
  isParticipant,
} from '~/lib/partners/policy'
import type { PartnerLinkRecord } from '~/types/partner'

function makeLink(overrides: Partial<PartnerLinkRecord> = {}): PartnerLinkRecord {
  return {
    id: 1n,
    userAId: 1n,
    userBId: 2n,
    initiatedByUserId: 1n,
    acceptedAt: new Date('2026-01-01T00:00:00.000Z'),
    userASharesDiaries: true,
    userBSharesDiaries: false,
    userASharesStockNotes: false,
    userBSharesStockNotes: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    userA: { id: 1n, email: 'a@example.com', name: 'A' },
    userB: { id: 2n, email: 'b@example.com', name: 'B' },
    ...overrides,
  }
}

describe('partner policy', () => {
  it('derives participant side, canonical status, and sharing decisions for either viewer', () => {
    const link = makeLink()

    expect(isParticipant(link, '1')).toBe(true)
    expect(isParticipant(link, '99')).toBe(false)
    expect(getPartnerLinkStatus(link, '1')).toBe('connected')
    expect(getPartnerSide(link, '1')).toMatchObject({
      self: link.userA,
      partner: link.userB,
      selfSharesDiaries: true,
      partnerSharesDiaries: false,
      selfSharesStockNotes: false,
      partnerSharesStockNotes: true,
      status: 'connected',
    })
    expect(getPartnerSide(link, '2')).toMatchObject({
      self: link.userB,
      partner: link.userA,
      selfSharesDiaries: false,
      partnerSharesDiaries: true,
      selfSharesStockNotes: true,
      partnerSharesStockNotes: false,
      status: 'connected',
    })
  })

  it('derives incoming and outgoing pending status from the initiator', () => {
    expect(getPartnerLinkStatus(makeLink({ acceptedAt: null }), '2')).toBe('pending_incoming')
    expect(getPartnerLinkStatus(makeLink({ acceptedAt: null }), '1')).toBe('pending_outgoing')
  })

  it('maps sharing commands to only the current participant fields', () => {
    const link = makeLink()

    expect(getSharingUpdateData(link, '1', { shareDiaries: false, shareStockNotes: true })).toEqual({
      userASharesDiaries: false,
      userASharesStockNotes: true,
    })
    expect(getSharingUpdateData(link, '2', { shareDiaries: true })).toEqual({
      userBSharesDiaries: true,
    })
  })
})
