import { attachDiaryTags } from '~/server/utils/diary-response'
import { getPartnerSide } from '~/lib/partners/policy'
import type { PartnerLinkRecord } from '~/types/partner'

export function serializeDiaryForPartnerView(diary: Record<string, any> | null) {
  if (!diary) return null

  return attachDiaryTags({
    id: diary.id,
    userId: diary.userId,
    title: diary.title,
    content: diary.content,
    tagsString: diary.tagsString,
    createdVia: diary.createdVia,
    createdByLabel: diary.createdByLabel,
    date: diary.date,
    createdAt: diary.createdAt,
    updatedAt: diary.updatedAt,
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
