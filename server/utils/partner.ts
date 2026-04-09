import { Errors } from '~/lib/errors/factory'

export interface PartnerParticipant {
  id: bigint
  email: string
  name: string | null
}

export interface PartnerLinkRecord {
  id: bigint
  userAId: bigint
  userBId: bigint
  initiatedByUserId: bigint
  acceptedAt: Date | null
  userASharesDiaries: boolean
  userBSharesDiaries: boolean
  createdAt: Date
  updatedAt: Date
  userA: PartnerParticipant
  userB: PartnerParticipant
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

export function isPartnerParticipant(link: Pick<PartnerLinkRecord, 'userAId' | 'userBId'>, userId: string | bigint) {
  const currentUserId = toBigIntId(userId)
  return link.userAId === currentUserId || link.userBId === currentUserId
}

export function assertPartnerParticipant(link: Pick<PartnerLinkRecord, 'userAId' | 'userBId'>, userId: string | bigint) {
  if (!isPartnerParticipant(link, userId)) {
    throw Errors.partnerLinkAccessDenied()
  }
}

export function getPartnerSide(link: PartnerLinkRecord, currentUserId: string | bigint) {
  const viewerId = toBigIntId(currentUserId)
  assertPartnerParticipant(link, viewerId)

  const isUserA = link.userAId === viewerId
  const self = isUserA ? link.userA : link.userB
  const partner = isUserA ? link.userB : link.userA

  return {
    self,
    partner,
    selfSharesDiaries: isUserA ? link.userASharesDiaries : link.userBSharesDiaries,
    partnerSharesDiaries: isUserA ? link.userBSharesDiaries : link.userASharesDiaries,
    shareField: isUserA ? 'userASharesDiaries' : 'userBSharesDiaries',
    accepted: Boolean(link.acceptedAt),
    initiatedByCurrentUser: link.initiatedByUserId === viewerId,
    pendingIncoming: !link.acceptedAt && link.initiatedByUserId !== viewerId,
    pendingOutgoing: !link.acceptedAt && link.initiatedByUserId === viewerId,
  } as const
}
