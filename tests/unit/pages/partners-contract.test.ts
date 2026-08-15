import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('partners and Pair View page contracts', () => {
  it('loads partner links and keeps the selected connected partner in the compare query', () => {
    const partners = source('pages/partners/index.vue')
    const compare = source('pages/timeline/compare.vue')
    const types = source('types/partner.ts')

    expect(partners).toContain("$fetch<PartnerLinksResponse>('/api/partners')")
    expect(partners).toContain('links.value = response.links')
    expect(partners).toContain('upsertLink(response.link)')

    expect(compare).toContain('id="pair-partner"')
    expect(compare).toContain('v-model="selectedPartnerId"')
    expect(compare).toContain('const acceptedLinks = computed(() => data.value?.links.filter(link => link.status === \'connected\') ?? [])')
    expect(compare).toContain('partnerId: selectedPartnerId.value || undefined')
    expect(compare).toContain("useFetch<PartnerCompareResponse>('/api/partners/compare'")
    expect(compare).toContain('watch: [query]')
    expect(compare).toContain('const selectedLink = computed')

    expect(types).toContain('selectedPartnerId: string | null')
    expect(types).toContain('links: PartnerLinkSummary[]')
  })

  it('sends separate diary and stock-note sharing flags from their own toggles', () => {
    const partners = source('pages/partners/index.vue')

    expect(partners).toContain(':checked="link.selfSharesDiaries"')
    expect(partners).toContain('@change="handleShareChange(link, $event)"')
    expect(partners).toContain("toggleSharingField(link, 'shareDiaries', target.checked)")
    expect(partners).toContain(':checked="link.selfSharesStockNotes"')
    expect(partners).toContain('@change="handleStockNotesShareChange(link, $event)"')
    expect(partners).toContain("toggleSharingField(link, 'shareStockNotes', target.checked)")
    expect(partners).toContain('body: { [field]: value }')
    expect(partners).toContain("const updateField = field === 'shareDiaries' ? 'selfSharesDiaries' : 'selfSharesStockNotes'")

    const types = source('types/partner.ts')
    expect(types).toContain('selfSharesDiaries: boolean')
    expect(types).toContain('partnerSharesDiaries: boolean')
    expect(types).toContain('selfSharesStockNotes: boolean')
    expect(types).toContain('partnerSharesStockNotes: boolean')
  })

  it('renders both sides of each returned same-day Pair View record', () => {
    const compare = source('pages/timeline/compare.vue')
    const types = source('types/partner.ts')

    expect(compare).toContain('v-for="day in data?.compareDays"')
    expect(compare).toContain(':key="day.dateKey"')
    expect(compare).toContain('v-if="day.ownerDiary"')
    expect(compare).toContain('v-if="day.partnerDiary"')
    expect(compare).toContain('day.ownerDiary.title')
    expect(compare).toContain('day.partnerDiary.title')
    expect(compare).toContain('day.ownerDiary.content')
    expect(compare).toContain('day.partnerDiary.content')

    expect(types).toContain('dateKey: string')
    expect(types).toContain('ownerDiary: PartnerCompareDiary | null')
    expect(types).toContain('partnerDiary: PartnerCompareDiary | null')
    expect(types).toContain('compareDays: PartnerCompareDay[]')
  })

  it('keeps loading, pending, connected, and no-link branches explicit', () => {
    const partners = source('pages/partners/index.vue')
    const compare = source('pages/timeline/compare.vue')

    expect(partners).toContain('v-if="isPartnersLoading"')
    expect(partners).toContain('v-else-if="links.length === 0"')
    expect(partners).toContain("'partner-pending': link.status !== 'connected'")
    expect(partners).toContain("'partner-connected': link.status === 'connected'")
    expect(partners).toContain("link.status === 'pending_incoming'")
    expect(partners).toContain("link.status === 'pending_outgoing'")
    expect(partners).toContain("link.status === 'connected'")

    expect(compare).toContain('v-else-if="!acceptedLinks.length"')
    expect(compare).toContain('v-if="!data?.compareDays.length"')
    expect(compare).toContain('partnerNotSharing')
  })
})
