type PricePoint = { close: number }

export function computeRelativeStrength(
  symbolSeries: PricePoint[],
  benchmarkSeries: PricePoint[],
  _period: '1m' | '3m' | '6m' | '1y'
): { relativeReturnPct: number | null, trend: 'strengthening' | 'weakening' | 'neutral' | 'unknown' } {
  if (symbolSeries.length < 2 || benchmarkSeries.length < 2) {
    return {
      relativeReturnPct: null,
      trend: 'unknown',
    }
  }

  const symbolStart = symbolSeries[0]!.close
  const symbolEnd = symbolSeries[symbolSeries.length - 1]!.close
  const benchmarkStart = benchmarkSeries[0]!.close
  const benchmarkEnd = benchmarkSeries[benchmarkSeries.length - 1]!.close

  const symbolReturn = ((symbolEnd - symbolStart) / symbolStart) * 100
  const benchmarkReturn = ((benchmarkEnd - benchmarkStart) / benchmarkStart) * 100
  const relativeReturnPct = symbolReturn - benchmarkReturn

  let trend: 'strengthening' | 'weakening' | 'neutral' | 'unknown' = 'neutral'
  if (relativeReturnPct > 1) trend = 'strengthening'
  if (relativeReturnPct < -1) trend = 'weakening'

  return { relativeReturnPct, trend }
}
