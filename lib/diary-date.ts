function parseYyyyMmDd(dateStr: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  return { year, month, day }
}

/**
 * Normalize a date-like input into UTC noon of the same UTC day.
 * We store diary dates at UTC noon to avoid timezone-boundary day shifts.
 */
export function toUtcNoonDate(input: string | Date): Date {
  if (typeof input === 'string') {
    const parsedYmd = parseYyyyMmDd(input)
    if (parsedYmd) {
      return new Date(Date.UTC(parsedYmd.year, parsedYmd.month - 1, parsedYmd.day, 12, 0, 0, 0))
    }
  }

  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date input')
  }

  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    12,
    0,
    0,
    0
  ))
}

export function getUtcDayRange(input: string | Date): { startOfDayUtc: Date; endOfDayUtc: Date } {
  const noon = toUtcNoonDate(input)
  const year = noon.getUTCFullYear()
  const month = noon.getUTCMonth()
  const day = noon.getUTCDate()

  return {
    startOfDayUtc: new Date(Date.UTC(year, month, day, 0, 0, 0, 0)),
    endOfDayUtc: new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
  }
}

/**
 * Format an input date into YYYY-MM-DD under the specified IANA timezone.
 */
export function formatYmdInTimezone(input: string | Date, timeZone: string): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date input')
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Failed to format date in timezone')
  }

  return `${year}-${month}-${day}`
}

/**
 * Convert an instant to a value suitable for <input type="datetime-local">.
 * This preserves round-trip at minute precision when saved with
 * new Date(value).toISOString().
 */
export function toDateTimeLocalValue(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date input')
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}
