import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('review queue page contract', () => {
  it('prioritizes attention and links into the structured review workflow', () => {
    const content = readFileSync(resolve(process.cwd(), 'pages/reviews/index.vue'), 'utf8')
    const section = readFileSync(resolve(process.cwd(), 'components/ReviewSection.vue'), 'utf8')

    expect(content).toContain('unscheduled: DiaryReviewItem[]')
    expect(content).toContain('reviewGroups.unscheduled')
    expect(content).toContain("review.queue.sections.unscheduled")
    expect(content).toContain('const needsAttention = computed')
    expect(content).toContain('reviewGroups.value.overdue')
    expect(content).toContain('reviewGroups.value.today')
    expect(section).toContain('`/diaries/${item.id}/review`')
    expect(section).toContain("review.startReview")
    expect(content).not.toContain('markReviewed')
    expect(section).not.toContain('markReviewed')
  })

  it('keeps completed and unscheduled groups secondary and collapsible', () => {
    const content = readFileSync(resolve(process.cwd(), 'pages/reviews/index.vue'), 'utf8')
    expect(content.match(/<details/g)).toHaveLength(2)
    expect(content).toContain("review.queue.sections.completed")
    expect(content).toContain("review.queue.sections.unscheduled")
  })
})
