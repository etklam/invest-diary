import { Errors } from '~/lib/errors/factory'
import type {
  PartnerLinkRecord,
  PartnerLinkStatus,
  PartnerParticipant,
} from '~/types/partner'

export type PartnerShareUpdate = {
  shareDiaries?: boolean
  shareStockNotes?: boolean
}

export interface PartnerSide {
  self: PartnerParticipant
  partner: PartnerParticipant
  selfSharesDiaries: boolean
  partnerSharesDiaries: boolean
  diaryShareField: 'userASharesDiaries' | 'userBSharesDiaries'
  stockNotesShareField: 'userASharesStockNotes' | 'userBSharesStockNotes'
  selfSharesStockNotes: boolean
  partnerSharesStockNotes: boolean
  accepted: boolean
  initiatedByCurrentUser: boolean
  pendingIncoming: boolean
  pendingOutgoing: boolean
  status: PartnerLinkStatus
}

export function toBigIntId(value: string | bigint): bigint {
  return typeof value === 'bigint' ? value : BigInt(value)
}

export function orderPartnerUserIds(left: string | bigint, right: string | bigint) {
  const leftId = toBigIntId(left)
  const rightId = toBigIntId(right)

  if (leftId === rightId) {
    throw Errors.validationError([
      { field: 'partnerEmail', message: 'You cannot partner with your own account' },
    ])
  }

  return leftId < rightId
    ? { userAId: leftId, userBId: rightId }
    : { userAId: rightId, userBId: leftId }
}

export function isParticipant(
  link: Pick<PartnerLinkRecord, 'userAId' | 'userBId'>,
  userId: string | bigint,
) {
  const currentUserId = toBigIntId(userId)
  return link.userAId === currentUserId || link.userBId === currentUserId
}

export function assertParticipant(
  link: Pick<PartnerLinkRecord, 'userAId' | 'userBId'>,
  userId: string | bigint,
) {
  if (!isParticipant(link, userId)) {
    throw Errors.partnerLinkAccessDenied()
  }
}

export function getPartnerLinkStatus(
  link: Pick<PartnerLinkRecord, 'userAId' | 'userBId' | 'initiatedByUserId' | 'acceptedAt'>,
  currentUserId: string | bigint,
): PartnerLinkStatus {
  const viewerId = toBigIntId(currentUserId)
  assertParticipant(link, viewerId)

  if (link.acceptedAt) return 'connected'
  return link.initiatedByUserId === viewerId ? 'pending_outgoing' : 'pending_incoming'
}

export function getPartnerSide(link: PartnerLinkRecord, currentUserId: string | bigint): PartnerSide {
  const viewerId = toBigIntId(currentUserId)
  assertParticipant(link, viewerId)

  const isUserA = link.userAId === viewerId
  const self = isUserA ? link.userA : link.userB
  const partner = isUserA ? link.userB : link.userA
  const status = getPartnerLinkStatus(link, viewerId)

  return {
    self,
    partner,
    selfSharesDiaries: isUserA ? link.userASharesDiaries : link.userBSharesDiaries,
    partnerSharesDiaries: isUserA ? link.userBSharesDiaries : link.userASharesDiaries,
    diaryShareField: isUserA ? 'userASharesDiaries' : 'userBSharesDiaries',
    stockNotesShareField: isUserA ? 'userASharesStockNotes' : 'userBSharesStockNotes',
    selfSharesStockNotes: isUserA ? link.userASharesStockNotes : link.userBSharesStockNotes,
    partnerSharesStockNotes: isUserA ? link.userBSharesStockNotes : link.userASharesStockNotes,
    accepted: status === 'connected',
    initiatedByCurrentUser: link.initiatedByUserId === viewerId,
    pendingIncoming: status === 'pending_incoming',
    pendingOutgoing: status === 'pending_outgoing',
    status,
  }
}

export function canViewPartnerDiaries(link: PartnerLinkRecord, currentUserId: string | bigint) {
  const side = getPartnerSide(link, currentUserId)
  return side.status === 'connected' && side.partnerSharesDiaries
}

export function canViewPartnerStockNotes(link: PartnerLinkRecord, currentUserId: string | bigint) {
  const side = getPartnerSide(link, currentUserId)
  return side.status === 'connected' && side.partnerSharesStockNotes
}

export function getSharingUpdateData(
  link: PartnerLinkRecord,
  currentUserId: string | bigint,
  sharing: PartnerShareUpdate,
): Partial<Pick<
  PartnerLinkRecord,
  'userASharesDiaries' | 'userBSharesDiaries' | 'userASharesStockNotes' | 'userBSharesStockNotes'
>> {
  const side = getPartnerSide(link, currentUserId)

  if (side.status !== 'connected') {
    throw Errors.partnerLinkPending()
  }

  const data: Partial<Pick<
    PartnerLinkRecord,
    'userASharesDiaries' | 'userBSharesDiaries' | 'userASharesStockNotes' | 'userBSharesStockNotes'
  >> = {}

  if (sharing.shareDiaries !== undefined) {
    data[side.diaryShareField] = sharing.shareDiaries
  }
  if (sharing.shareStockNotes !== undefined) {
    data[side.stockNotesShareField] = sharing.shareStockNotes
  }

  return data
}

// Compatibility aliases for existing callers while the policy seam settles.
export const isPartnerParticipant = isParticipant
export const assertPartnerParticipant = assertParticipant
