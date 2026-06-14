import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('position sizing workflow integration', () => {
  const page = () => readFileSync(resolve(process.cwd(), 'pages/tools/position-sizing.vue'), 'utf8')

  it('keeps copy markdown behavior while adding diary save actions', () => {
    const content = page()

    expect(content).toContain('const copyToClipboard = async () =>')
    expect(content).toContain('navigator.clipboard.writeText(markdown)')
    expect(content).toContain('showSaveToDiaryModal')
    expect(content).toContain("savePositionSizingToDiary(true)")
    expect(content).toContain("savePositionSizingToDiary(false)")
    expect(content).toContain("$fetch('/api/diaries'")
    expect(content).toContain("appendToToday")
    expect(content).toContain("isAuthSessionError(error)")
    expect(content).toContain("router.push('/auth/login')")
  })

  it('prefills trade plan creation from position sizing output without AI generation', () => {
    const content = page()

    expect(content).toContain('createTradePlanFromPositionSizing')
    expect(content).toContain("sessionStorage.setItem('tradePlanPrefill'")
    expect(content).toContain("router.push('/trade-plans/new?prefill=position-sizing')")
    expect(content).toContain('maxPositionSize')
    expect(content).not.toMatch(/openai|claude|gemini|llm/i)
  })

  it('loads position sizing prefill state on trade plan new page', () => {
    const content = readFileSync(resolve(process.cwd(), 'pages/trade-plans/new.vue'), 'utf8')

    expect(content).toContain("route.query.prefill !== 'position-sizing'")
    expect(content).toContain("sessionStorage.getItem('tradePlanPrefill')")
    expect(content).toContain('statePrefill.value')
  })
})
