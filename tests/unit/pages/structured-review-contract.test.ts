import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('structured review page contract', () => {
  it('separates read-only original context from editable retrospective fields', () => {
    const page = source('pages/diaries/[id]/review.vue')
    expect(page).toContain("review.page.originalContext")
    expect(page).toContain('diary.thesis')
    expect(page).toContain('diary.risk')
    expect(page).toContain('diary.execution')
    expect(page).toContain('v-model="form.reviewOutcome"')
    expect(page).toContain('v-model="form[field.key]"')
    expect(page).not.toContain('v-model="diary.thesis"')
  })

  it('contains accessible validation, legacy compatibility, and related context', () => {
    const page = source('pages/diaries/[id]/review.vue')
    expect(page).toContain('<fieldset>')
    expect(page).toContain('type="radio"')
    expect(page).toContain('role="alert"')
    expect(page).toContain('aria-live="polite"')
    expect(page).toContain('isLegacyReview')
    expect(page).toContain('diary.transactions')
    expect(page).toContain('diary.tradePlans')
  })

  it('adds start/view review and execution to Diary detail', () => {
    const detail = source('pages/diaries/[id]/index.vue')
    expect(detail).toContain('diary.execution')
    expect(detail).toContain('`/diaries/${diary.id}/review`')
    expect(detail).toContain("review.startReview")
    expect(detail).toContain("review.viewReview")
  })
})
