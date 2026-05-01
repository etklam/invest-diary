import type { Diary } from '~/types/diary'

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
  selfSharesDiaries: boolean
  partnerSharesDiaries: boolean
  pendingIncoming: boolean
  pendingOutgoing: boolean
  initiatedByCurrentUser: boolean
}

export interface PartnerLinksResponse {
  links: PartnerLinkSummary[]
}

export interface PartnerCompareDay {
  dateKey: string
  ownerDiary: Diary | null
  partnerDiary: Diary | null
}

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
