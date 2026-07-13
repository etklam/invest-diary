import { Errors } from '~/lib/errors/factory'
import {
  assertParticipant,
  getPartnerSide,
  getSharingUpdateData,
  orderPartnerUserIds,
  toBigIntId,
} from '~/lib/partners/policy'
import type { PartnerLinkRecord } from '~/types/partner'
import {
  createPartnerLinkRecord,
  deletePartnerLinkRecord,
  findPartnerLinkBetweenUsers,
  findPartnerLinkById,
  findPartnerLinkByUserPair,
  findPartnerUserByEmail,
  updatePartnerLinkRecord,
} from '~/server/utils/partner-queries'

export {
  assertParticipant,
  assertPartnerParticipant,
  getPartnerSide,
  isParticipant,
  isPartnerParticipant,
  orderPartnerUserIds,
  toBigIntId,
} from '~/lib/partners/policy'
export type { PartnerLinkRecord, PartnerParticipant } from '~/types/partner'

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

  if (side.status !== 'pending_incoming') {
    throw Errors.partnerLinkAccessDenied()
  }

  return updatePartnerLinkRecord(linkId, { acceptedAt: new Date() })
}

export async function removePartnerLink(linkId: bigint, currentUserId: string | bigint) {
  const link = await requirePartnerLink(linkId)
  assertParticipant(link, currentUserId)
  await deletePartnerLinkRecord(linkId)
}

export async function updatePartnerSharing(
  linkId: bigint,
  currentUserId: string | bigint,
  sharing: { shareDiaries?: boolean, shareStockNotes?: boolean },
) {
  const link = await requirePartnerLink(linkId)
  const data = getSharingUpdateData(link, currentUserId, sharing)

  return updatePartnerLinkRecord(linkId, data)
}

export async function resolveSharedStockNotesOwner(viewerId: string | bigint, partnerId: string) {
  const currentUserId = toBigIntId(viewerId)
  const partnerUserId = parsePartnerUserId(partnerId)
  const link = await findPartnerLinkBetweenUsers(currentUserId, partnerUserId)

  if (!link) {
    throw Errors.partnerLinkAccessDenied()
  }

  const typedLink = link as PartnerLinkRecord
  const side = getPartnerSide(typedLink, currentUserId)
  if (side.status !== 'connected') {
    throw Errors.partnerLinkAccessDenied()
  }
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
