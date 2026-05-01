import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import type { DrawdownAlertPayload } from '~/types/websocket'

const log = logger.alert

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrawdownCheckConfig {
  userId: bigint
  thresholdPct?: number
}

export interface DrawdownStatus {
  drawdownPct: number
  peakValue: number
  currentValue: number
  peakDate: string
  currentDate: string
  benchmarkSymbol: string
  snapshotCount: number
}

export interface DrawdownCheckResult {
  hasAlert: boolean
  payload: DrawdownAlertPayload | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * 查詢用戶所有 PortfolioSnapshot，計算從歷史高點到當前市值的回撤百分比。
 *
 * 回撤公式： (peakValue - currentValue) / peakValue * 100
 * 峰值：所有快照中 totalMarketValue 最大值
 * 當前值：最新快照的 totalMarketValue
 *
 * @returns DrawdownStatus 或 null（快照不足 2 筆時）
 */
export async function getDrawdownStatus(userId: bigint): Promise<DrawdownStatus | null> {
  try {
    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: { userId },
      orderBy: { snapshotDate: 'desc' },
    })

    if (snapshots.length < 2) {
      log.debug('Insufficient snapshots for drawdown check', {
        userId: userId.toString(),
        snapshotCount: snapshots.length,
      })
      return null
    }

    // 在全部快照中找出歷史峰值
    let peakSnapshot = snapshots[0]
    for (const s of snapshots) {
      if (Number(s.totalMarketValue) > Number(peakSnapshot.totalMarketValue)) {
        peakSnapshot = s
      }
    }

    const latestSnapshot = snapshots[0] // 已按 snapshotDate desc 排序
    const peakValue = Number(peakSnapshot.totalMarketValue)
    const currentValue = Number(latestSnapshot.totalMarketValue)

    // 避免除以零
    const drawdownPct = peakValue > 0
      ? ((peakValue - currentValue) / peakValue) * 100
      : 0

    return {
      drawdownPct: Math.round(drawdownPct * 100) / 100,
      peakValue: Math.round(peakValue * 100) / 100,
      currentValue: Math.round(currentValue * 100) / 100,
      peakDate: formatDate(peakSnapshot.snapshotDate),
      currentDate: formatDate(latestSnapshot.snapshotDate),
      benchmarkSymbol: latestSnapshot.benchmarkSymbol ?? 'SPY',
      snapshotCount: snapshots.length,
    }
  } catch (error) {
    log.error('Failed to calculate drawdown', {
      userId: userId.toString(),
      error: String(error),
    })
    return null
  }
}

/**
 * 檢查用戶投資組合是否超過回撤閾值，若超過則產生 WebSocket 推播用的 alert payload。
 *
 * @returns DrawdownCheckResult - hasAlert 表示是否觸發，payload 為推送資料
 */
export async function checkDrawdown(config: DrawdownCheckConfig): Promise<DrawdownCheckResult> {
  const { userId, thresholdPct = 10 } = config
  const status = await getDrawdownStatus(userId)

  if (!status) {
    return { hasAlert: false, payload: null }
  }

  if (status.drawdownPct < thresholdPct) {
    log.debug('Drawdown below threshold, no alert', {
      userId: userId.toString(),
      drawdownPct: status.drawdownPct,
      thresholdPct,
    })
    return { hasAlert: false, payload: null }
  }

  const message = `Portfolio drawdown of ${status.drawdownPct}% from peak of $${status.peakValue.toLocaleString()} (${status.peakDate}). Current value: $${status.currentValue.toLocaleString()} (${status.currentDate}).`

  const payload: DrawdownAlertPayload = {
    currentValue: status.currentValue,
    peakValue: status.peakValue,
    drawdownPct: status.drawdownPct,
    threshold: thresholdPct,
    peakDate: status.peakDate,
    currentDate: status.currentDate,
    message,
    benchmarkSymbol: status.benchmarkSymbol,
  }

  log.info('Drawdown alert triggered', {
    userId: userId.toString(),
    drawdownPct: status.drawdownPct,
    thresholdPct,
  })

  return { hasAlert: true, payload }
}
