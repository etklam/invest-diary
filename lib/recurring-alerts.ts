import type { Prisma } from '@prisma/client'

export interface RecurringAlertConfig {
  startDate: Date
  triggerTime: string // 'HH:MM' format, from diary creation time
  mode: 'WEEK' | 'MONTH'
  message: string
  diaryId: bigint
}

/**
 * Calculate all trigger dates for recurring alerts (skip weekends)
 */
export function calculateRecurringAlertDates(config: RecurringAlertConfig): Date[] {
  const { startDate, triggerTime } = config
  const dates: Date[] = []
  const [hours = 0, minutes = 0] = triggerTime.split(':').map(Number)

  let currentDate = new Date(startDate)
  currentDate.setHours(hours, minutes, 0, 0)

  // Calculate end date
  const endDate = calculateEndDate(currentDate, config.mode)

  // Generate all weekday dates
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()

    // Skip Saturday(6) and Sunday(0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(new Date(currentDate))
    }

    // Next day
    currentDate.setDate(currentDate.getDate() + 1)
    currentDate.setHours(hours, minutes, 0, 0)
  }

  return dates
}

/**
 * Calculate end date based on mode
 */
function calculateEndDate(startDate: Date, mode: 'WEEK' | 'MONTH'): Date {
  const endDate = new Date(startDate)

  if (mode === 'WEEK') {
    // Find this week's Friday
    const dayOfWeek = startDate.getDay()
    const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 5 + (7 - dayOfWeek)
    endDate.setDate(startDate.getDate() + daysUntilFriday)
    endDate.setHours(23, 59, 59, 999)
  } else {
    // MONTH: Last day of this month
    endDate.setMonth(startDate.getMonth() + 1)
    endDate.setDate(0) // Last day of previous month = last day of current month
    endDate.setHours(23, 59, 59, 999)
  }

  return endDate
}

/**
 * Generate Prisma data for batch creating alerts
 */
export function generateRecurringAlertsData(
  config: RecurringAlertConfig
): Prisma.AlertCreateManyInput[] {
  const dates = calculateRecurringAlertDates(config)

  return dates.map((date, index) => ({
    diaryId: config.diaryId,
    message: config.message,
    triggerAt: date,
    recurringMode: config.mode,
    instanceNumber: index + 1,
    // First alert is the parent, parentId will be updated later
    parentId: index === 0 ? BigInt(0) : undefined,
  }))
}

/**
 * Check if date is a weekday
 */
export function isWeekday(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6 // 0=Sunday, 6=Saturday
}

/**
 * Get next weekday
 */
export function getNextWeekday(date: Date): Date {
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)

  while (!isWeekday(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1)
  }

  return nextDay
}
