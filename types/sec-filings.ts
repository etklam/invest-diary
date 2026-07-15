export type SecCacheStatus = 'miss' | 'hit' | 'stale'

export interface SecCacheMeta {
  stale: boolean
  cacheStatus: SecCacheStatus
  fetchedAt: string
}

export interface SecApiResponse<T> {
  data: T
  meta: SecCacheMeta
}

export interface SecCompany {
  cik: string
  name: string
  tickers: string[]
  exchanges: string[]
}

export interface SecCompanySearchResult extends SecCompany {
  matchedBy: 'cik' | 'ticker' | 'name'
}

export type SecAmendmentFilter = 'include' | 'exclude' | 'only'

export interface SecFilingFilters {
  forms: string[]
  filedFrom?: string
  filedTo?: string
  periodFrom?: string
  periodTo?: string
  amendments: SecAmendmentFilter
  cursor?: string
  limit: number
}

export interface SecFilingSummary {
  cik: string
  accession: string
  filingDate: string
  reportDate: string | null
  acceptanceDateTime: string | null
  form: string
  isAmendment: boolean
  primaryDocument: string
  primaryDocumentDescription: string | null
  fileNumber: string | null
  filmNumber: string | null
  items: string | null
  size: number | null
}

export interface SecFilingPage {
  company: SecCompany
  filings: SecFilingSummary[]
  nextCursor: string | null
}

export type SecDocumentClass = 'primary' | 'complete-submission' | 'xbrl' | 'exhibit' | 'pdf' | 'other'

export interface SecFilingDocument {
  basename: string
  description: string | null
  type: string | null
  sequence: number | null
  size: number
  classification: SecDocumentClass
  isPrimary: boolean
  isPdf: boolean
  isXbrl: boolean
  isExhibit: boolean
}

export interface SecFilingDetail {
  company: SecCompany
  filing: SecFilingSummary
  documents: SecFilingDocument[]
  hasPdf: boolean
}

export type SecBatchMode = 'primary' | 'complete'

export interface SecBatchRequest {
  cik: string
  accessions: string[]
  mode: SecBatchMode
}

export type SecProviderErrorCode =
  | 'SEC_CONFIG_MISSING'
  | 'SEC_VALIDATION_ERROR'
  | 'SEC_COMPANY_NOT_FOUND'
  | 'SEC_FILING_NOT_FOUND'
  | 'SEC_DOCUMENT_NOT_FOUND'
  | 'SEC_UPSTREAM_RATE_LIMITED'
  | 'SEC_UPSTREAM_UNAVAILABLE'
  | 'SEC_UPSTREAM_INVALID_RESPONSE'
  | 'SEC_QUEUE_FULL'
  | 'SEC_UNSAFE_REDIRECT'
  | 'SEC_FILE_TOO_LARGE'
  | 'SEC_PACKAGE_LIMIT_EXCEEDED'
  | 'SEC_RATE_LIMITED'
