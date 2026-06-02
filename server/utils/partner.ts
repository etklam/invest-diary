import { Errors } from '~/lib/errors/factory'
import {
  createPartnerLinkRecord,
  deletePartnerLinkRecord,
  findPartnerLinkBetweenUsers,
  findPartnerLinkById,
  findPartnerLinkByUserPair,
  findPartnerUserByEmail,
  updatePartnerLinkRecord,
} from '~/server/utils/partner-queries'

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
  userASharesStockNotes: boolean
  userBSharesStockNotes: boolean
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
    diaryShareField: isUserA ? 'userASharesDiaries' as const : 'userBSharesDiaries' as const,
    stockNotesShareField: isUserA ? 'userASharesStockNotes' as const : 'userBSharesStockNotes' as const,
    selfSharesStockNotes: isUserA ? link.userASharesStockNotes : link.userBSharesStockNotes,
    partnerSharesStockNotes: isUserA ? link.userBSharesStockNotes : link.userASharesStockNotes,
    accepted: Boolean(link.acceptedAt),
    initiatedByCurrentUser: link.initiatedByUserId === viewerId,
    pendingIncoming: !link.acceptedAt && link.initiatedByUserId !== viewerId,
    pendingOutgoing: !link.acceptedAt && link.initiatedByUserId === viewerId,
  } as const
}

export async function createPartnerLink(currentUserId: string | bigint, partnerEmail: string) {
  const initiatorId = toBigIntId(currentUserId)
  const partnerUser = await findPartnerUserByEmail(partnerEmail)

  if (!partnerUser) {
    throw Errors.userNotFound()
  }

  const ordered = orderPartnerUserIds(initiatorId, partnerUser.id)
  const existing = await findPartnerLinkByUserPair(ordered.userAId, ordered.userBId)

  if (existing) {
    throw Errors.partnerLinkAlreadyExists()
  }

  return createPartnerLinkRecord(ordered.userAId, ordered.userBId, initiatorId)
}

export async function acceptPartnerLink(linkId: bigint, currentUserId: string | bigint) {
  const link = await requirePartnerLink(linkId)
  const side = getPartnerSide(link, currentUserId)

  if (!side.pendingIncoming) {
    throw Errors.partnerLinkAccessDenied()
  }

  return updatePartnerLinkRecord(linkId, { acceptedAt: new Date() })
}

export async function removePartnerLink(linkId: bigint, currentUserId: string | bigint) {
  const link = await requirePartnerLink(linkId)
  assertPartnerParticipant(link, currentUserId)
  await deletePartnerLinkRecord(linkId)
}

export async function updatePartnerSharing(
  linkId: bigint,
  currentUserId: string | bigint,
  sharing: { shareDiaries?: boolean, shareStockNotes?: boolean },
) {
  const link = await requirePartnerLink(linkId)
  const side = getPartnerSide(link, currentUserId)

  if (!side.accepted) {
    throw Errors.partnerLinkPending()
  }

  const data: Record<string, boolean> = {}
  if (sharing.shareDiaries !== undefined) {
    data[side.diaryShareField] = sharing.shareDiaries
  }
  if (sharing.shareStockNotes !== undefined) {
    data[side.stockNotesShareField] = sharing.shareStockNotes
  }

  return updatePartnerLinkRecord(linkId, data)
}

export async function resolveSharedStockNotesOwner(viewerId: string | bigint, partnerId: string) {
  const currentUserId = toBigIntId(viewerId)
  const partnerUserId = parsePartnerUserId(partnerId)
  const link = await findPartnerLinkBetweenUsers(currentUserId, partnerUserId)

  if (!link || !link.acceptedAt) {
    throw Errors.partnerLinkAccessDenied()
  }

  const side = getPartnerSide(link as PartnerLinkRecord, currentUserId)
  if (!side.partnerSharesStockNotes) {
    throw Errors.forbidden('Partner has not enabled stock notes sharing')
  }

  return side.partner.id
}

async function requirePartnerLink(linkId: bigint): Promise<PartnerLinkRecord> {
  const link = await findPartnerLinkById(linkId)
  if (!link) {
    throw Errors.partnerLinkNotFound()
  }

  return link as PartnerLinkRecord
}

function parsePartnerUserId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw Errors.validationError([
      { field: 'partnerId', message: 'Invalid partnerId', value },
    ])
  }

  return BigInt(value)
}
