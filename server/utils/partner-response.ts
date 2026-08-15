import { getPartnerSide } from '~/lib/partners/policy'
import type { PartnerLinkRecord } from '~/types/partner'

export function serializePartnerLink(link: PartnerLinkRecord, currentUserId: string | bigint) {
  const side = getPartnerSide(link, currentUserId)

  return {
    id: link.id,
    acceptedAt: link.acceptedAt,
    createdAt: link.createdAt,
    partner: {
      id: side.partner.id,
      email: side.partner.email,
      name: side.partner.name,
    },
    status: side.status,
    selfSharesDiaries: side.selfSharesDiaries,
    partnerSharesDiaries: side.partnerSharesDiaries,
    selfSharesStockNotes: side.selfSharesStockNotes,
    partnerSharesStockNotes: side.partnerSharesStockNotes,
    pendingIncoming: side.pendingIncoming,
    pendingOutgoing: side.pendingOutgoing,
    initiatedByCurrentUser: side.initiatedByCurrentUser,
  }
}
