import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const locale = (name: string) => JSON.parse(readFileSync(resolve(process.cwd(), 'i18n/locales', `${name}.json`), 'utf8'))

describe('Timeline-first page contracts', () => {
  it('keeps the selected Pair View partner in the route query without a duplicate refresh', () => {
    const compare = source('pages/timeline/compare.vue')
    expect(compare).toContain("...(value ? { partnerId: value } : { partnerId: undefined })")
    expect(compare).toContain("watch(() => data.value?.selectedPartnerId")
    expect(compare).not.toContain('refresh()')
  })

  it('uses the shared Quick Diary launcher while preserving Calendar context', () => {
    const calendar = source('pages/calendar.vue')
    expect(calendar).toContain("source: 'calendar'")
    expect(calendar).toContain('...(date ? { date } : {})')
    expect(calendar).not.toContain('<QuickDiaryModal')
  })

  it('keeps Diaries focused on library behavior instead of dashboard summary data', () => {
    const diaries = source('pages/diaries/index.vue')
    expect(diaries).not.toContain("'/api/diaries/summary'")
    expect(diaries).not.toContain('desk.nextMove')
    expect(diaries).not.toContain('desk.rules')
    expect(diaries).toContain("$t('desk.filter.title')")
  })

  it('teaches the Timeline-first workflow on How to Use', () => {
    const guide = source('pages/how-to-use.vue')
    expect(guide).toContain('AUTHENTICATED_HOME_ROUTE')
    expect(guide).toContain("timeline: { link: '/timeline'")
    expect(guide).toContain("'/timeline/compare'")
    expect(guide).not.toContain("isAuthenticated.value ? '/diaries'")
  })

  it('surfaces a compact structured review outcome without exposing review text', () => {
    const timeline = source('pages/timeline/index.vue')
    expect(timeline).toContain("diary.reviewStatus === 'reviewed'")
    expect(timeline).toContain('reviewSignal(diary.reviewOutcome)')
    expect(timeline).not.toContain('diary.reviewSummary')
    expect(timeline).not.toContain('diary.reviewLearning')
    expect(timeline).not.toContain('diary.reviewAdjustment')
  })

  it('keeps the canonical Diary Timeline primary while preserving the four-section overview', () => {
    const timeline = source('pages/timeline/index.vue')

    const portfolio = timeline.indexOf('overview-portfolio-title')
    const attention = timeline.indexOf('overview-attention-title')
    const activity = timeline.indexOf('overview-activity-title')
    const upcoming = timeline.indexOf('overview-upcoming-title')
    const fullTimeline = timeline.indexOf('id="diary-timeline"')

    expect(timeline).toContain('<details class="timeline-overview')
    expect(timeline).toContain("t('timeline.overview.summary.viewOverview')")
    expect(timeline).toContain("t('timeline.overview.summary.portfolioValue')")
    expect(timeline).toContain("t('timeline.overview.summary.needsAttention')")
    expect(timeline).toContain("t('timeline.overview.summary.reviewsUpcoming')")
    expect(timeline).toContain('const upcomingReviewCount = computed')
    expect(timeline).toContain('const attentionCount = computed')
    expect(portfolio).toBeGreaterThan(-1)
    expect(portfolio).toBeLessThan(attention)
    expect(attention).toBeLessThan(activity)
    expect(activity).toBeLessThan(upcoming)
    expect(upcoming).toBeLessThan(fullTimeline)
    expect(timeline).toContain('diaries.value.slice(0, 5)')
    expect(timeline).toContain('].slice(0, 4)')
    expect(timeline).toContain("'/api/stocks/portfolio'")
    expect(timeline).toContain("'/api/reviews'")
    expect(timeline).not.toContain("'/overview'")
    expect(timeline).toContain("t('timeline.title')")
  })

  it('keeps Timeline as the primary name across navigation and page headings', () => {
    const locales = ['en', 'zh-TW', 'zh-CN'].map(locale)

    expect(locales.map(messages => messages.nav.timeline)).toEqual(['Timeline', '時間軸', '时间轴'])
    expect(locales.map(messages => messages.timeline.title)).toEqual(['Investment Timeline', '投資時間軸', '投资时间轴'])
  })

  it('shows owner Trade Plan signals in metadata priority order without changing Pair View privacy', () => {
    const timeline = source('pages/timeline/index.vue')
    const partnerQueries = source('server/utils/partner-queries.ts')
    const tag = timeline.indexOf('v-for="tag in (diary.tags || []).slice(0, 2)"')
    const plan = timeline.indexOf('v-if="diary.tradePlanSummary"')
    const transaction = timeline.indexOf('v-if="diary.transactions?.length"')
    const review = timeline.indexOf("v-if=\"diary.reviewStatus === 'reviewed'\"")
    const alert = timeline.indexOf('v-if="diary.alerts?.length"')

    expect(tag).toBeLessThan(plan)
    expect(plan).toBeLessThan(transaction)
    expect(transaction).toBeLessThan(review)
    expect(review).toBeLessThan(alert)
    expect(timeline).toContain('class="truncate"')
    expect(partnerQueries).not.toContain('tradePlanSummary')
    expect(partnerQueries).not.toContain('tradePlans:')
  })
})
