import type { Diary } from '~/types/diary'

export type PartnerLinkStatus = 'pending_incoming' | 'pending_outgoing' | 'connected'

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

export interface PartnerAccountSummary {
  id: string
  email: string
  name?: string | null
}

export interface PartnerLinkSummary {
  id: string
  acceptedAt: string | null
  createdAt: string
  partner: PartnerAccountSummary
  status: PartnerLinkStatus
  selfSharesDiaries: boolean
  partnerSharesDiaries: boolean
  selfSharesStockNotes: boolean
  partnerSharesStockNotes: boolean
  pendingIncoming: boolean
  pendingOutgoing: boolean
  initiatedByCurrentUser: boolean
}

export interface PartnerLinksResponse {
  links: PartnerLinkSummary[]
}

export interface PartnerCompareDay {
  dateKey: string
  ownerDiary: PartnerCompareDiary | null
  partnerDiary: PartnerCompareDiary | null
}

export type PartnerCompareDiary = Pick<Diary,
  | 'id'
  | 'userId'
  | 'title'
  | 'content'
  | 'createdVia'
  | 'createdByLabel'
  | 'date'
  | 'createdAt'
  | 'updatedAt'
> & { tags?: string[] }

export interface PartnerCompareResponse {
  owner: PartnerAccountSummary
  partner: PartnerAccountSummary | null
  selectedPartnerId: string | null
  links: PartnerLinkSummary[]
  compareDays: PartnerCompareDay[]
}

export interface ApiKeySummary {
  id: string
  label: string
  keyPrefix: string
  scope: 'DIARY_CREATE' | 'AGENT_WRITE'
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export interface ApiKeysResponse {
  keys: ApiKeySummary[]
}

export interface ApiKeyCreateResponse {
  key: ApiKeySummary
  rawKey: string
}
