import { describe, expect, it } from 'vitest'
import { determineRegime } from '~/lib/marketbee/regime'

describe('determineRegime', () => {
  it('down4Pct 達 15% 時觸發 risk_off', () => {
    const result = determineRegime({
      up4Count: 5,
      down4Count: 15,
      universeCount: 100,
      above40dPct: 45,
      ratio10d: 1,
    })

    expect(result.regime).toBe('risk_off')
    expect(result.isThrust).toBe(false)
    expect(result.up4Pct).toBeCloseTo(5)
    expect(result.down4Pct).toBeCloseTo(15)
  })

  it('above40dPct 低於 20% 時觸發 risk_off', () => {
    const result = determineRegime({
      up4Count: 2,
      down4Count: 8,
      universeCount: 100,
      above40dPct: 19.99,
      ratio10d: 1.1,
    })

    expect(result.regime).toBe('risk_off')
    expect(result.isThrust).toBe(false)
  })

  it('同時滿足 defensive 與 risk_off 時優先返回 risk_off', () => {
    const result = determineRegime({
      up4Count: 5,
      down4Count: 16,
      universeCount: 100,
      above40dPct: 18,
      ratio10d: 0.4,
    })

    expect(result.regime).toBe('risk_off')
    expect(result.isThrust).toBe(false)
  })

  it('ratio10d 小於等於 0.7 時觸發 defensive', () => {
    const result = determineRegime({
      up4Count: 4,
      down4Count: 7,
      universeCount: 100,
      above40dPct: 45,
      ratio10d: 0.7,
    })

    expect(result.regime).toBe('defensive')
    expect(result.isThrust).toBe(false)
  })

  it('down4Pct 至少為 up4Pct 兩倍時觸發 defensive', () => {
    const result = determineRegime({
      up4Count: 4,
      down4Count: 8,
      universeCount: 100,
      above40dPct: 45,
      ratio10d: 1,
    })

    expect(result.regime).toBe('defensive')
    expect(result.isThrust).toBe(false)
  })

  it('above40dPct 低於 35% 時觸發 defensive', () => {
    const result = determineRegime({
      up4Count: 8,
      down4Count: 5,
      universeCount: 100,
      above40dPct: 34.99,
      ratio10d: 1,
    })

    expect(result.regime).toBe('defensive')
    expect(result.isThrust).toBe(false)
  })

  it('ratio10d 等於 2.0 且市場寬度健康時觸發 risk_on with isThrust=true', () => {
    const result = determineRegime({
      up4Count: 10,
      down4Count: 5,
      universeCount: 100,
      above40dPct: 50,
      ratio10d: 2,
    })

    expect(result.regime).toBe('risk_on')
    expect(result.isThrust).toBe(true)
  })

  it('ratio10d 達 1.2 且 above40dPct 達 55% 時觸發 risk_on with isThrust=false', () => {
    const result = determineRegime({
      up4Count: 7,
      down4Count: 4,
      universeCount: 100,
      above40dPct: 55,
      ratio10d: 1.2,
    })

    expect(result.regime).toBe('risk_on')
    expect(result.isThrust).toBe(false)
  })

  it('沒有匹配任何風險或強勢條件時返回 neutral', () => {
    const result = determineRegime({
      up4Count: 6,
      down4Count: 4,
      universeCount: 100,
      above40dPct: 45,
      ratio10d: 1,
    })

    expect(result.regime).toBe('neutral')
    expect(result.isThrust).toBe(false)
  })

  it('score 依 ratio10d、above40dPct、up4Pct 穩定計算並限制在 0 到 100', () => {
    const result = determineRegime({
      up4Count: 10,
      down4Count: 5,
      universeCount: 100,
      above40dPct: 60,
      ratio10d: 2,
    })

    expect(result.score).toBe(79)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('universeCount 為 0 時不除以零，百分比回傳 0', () => {
    const result = determineRegime({
      up4Count: 10,
      down4Count: 10,
      universeCount: 0,
      above40dPct: 50,
      ratio10d: 1,
    })

    expect(result.up4Pct).toBe(0)
    expect(result.down4Pct).toBe(0)
  })
})
