import { attachDiaryTags } from '~/server/utils/diary-response'
import { getPartnerSide, type PartnerLinkRecord } from '~/server/utils/partner'
import type { Diary } from '~/types/diary'

export function serializeDiaryForPartnerView<T extends Diary>(diary: T | null) {
  if (!diary) return null

  return attachDiaryTags({
    ...diary,
    transactions: undefined,
    alerts: undefined,
  })
}

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
    selfSharesDiaries: side.selfSharesDiaries,
    partnerSharesDiaries: side.partnerSharesDiaries,
    selfSharesStockNotes: side.selfSharesStockNotes,
    partnerSharesStockNotes: side.partnerSharesStockNotes,
    pendingIncoming: side.pendingIncoming,
    pendingOutgoing: side.pendingOutgoing,
    initiatedByCurrentUser: side.initiatedByCurrentUser,
  }
}
