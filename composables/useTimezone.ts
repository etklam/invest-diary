/**
 * Timezone composable for managing user timezone preferences
 */
import { formatUserDateTime, getDateTimeFormat, formatYmdInTimezone } from '~/lib/dates'
import { getUserTodayYmd, resolveUserTimezone } from '~/lib/dates/user-tz'

export const useTimezone = () => {
  const { user } = useAuth()
  const { locale } = useI18n()

  // Common timezones for stock market users
  const commonTimezones = [
    { value: 'Asia/Taipei', label: '台北 (UTC+8)', offset: '+08:00' },
    { value: 'Asia/Hong_Kong', label: '香港 (UTC+8)', offset: '+08:00' },
    { value: 'Asia/Shanghai', label: '上海 (UTC+8)', offset: '+08:00' },
    { value: 'Asia/Singapore', label: '新加坡 (UTC+8)', offset: '+08:00' },
    { value: 'Asia/Tokyo', label: '東京 (UTC+9)', offset: '+09:00' },
    { value: 'Asia/Seoul', label: '首爾 (UTC+9)', offset: '+09:00' },
    { value: 'America/New_York', label: '紐約 (UTC-5)', offset: '-05:00' },
    { value: 'America/Chicago', label: '芝加哥 (UTC-6)', offset: '-06:00' },
    { value: 'America/Los_Angeles', label: '洛杉磯 (UTC-8)', offset: '-08:00' },
    { value: 'America/Toronto', label: '多倫多 (UTC-5)', offset: '-05:00' },
    { value: 'Europe/London', label: '倫敦 (UTC+0)', offset: '+00:00' },
    { value: 'Europe/Paris', label: '巴黎 (UTC+1)', offset: '+01:00' },
    { value: 'Europe/Berlin', label: '柏林 (UTC+1)', offset: '+01:00' },
    { value: 'Australia/Sydney', label: '雪梨 (UTC+10)', offset: '+10:00' },
    { value: 'UTC', label: 'UTC (UTC+0)', offset: '+00:00' }
  ]

  // Get user's local timezone from browser
  const detectLocalTimezone = (): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }

  // Resolve the canonical profile timezone for all date/time display.
  const getTimezone = (): string => {
    return resolveUserTimezone(user.value)
  }

  const getLocale = (): string => locale.value || 'zh-TW'

  // Set timezone and persist to localStorage
  const setTimezone = (timezone: string) => {
    if (process.client) {
      localStorage.setItem('user_timezone', timezone)
    }
  }

  // Format date with user's timezone
  const formatDateInTimezone = (
    date: Date | string,
    format: 'full' | 'short' | 'weekday' = 'full',
    timezone?: string
  ): string => {
    const userTimezone = timezone || getTimezone()
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const formatted = formatUserDateTime(dateObj, {
      timezone: userTimezone,
      locale: 'zh-TW',
      format: format === 'full'
        ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
        : { year: 'numeric', month: '2-digit', day: '2-digit' },
    })

    // Add weekday for 'weekday' format
    if (format === 'weekday') {
      const ymd = formatYmdInTimezone(dateObj, userTimezone)
      const weekday = ['日', '一', '二', '三', '四', '五', '六'][
        new Date(`${ymd}T00:00:00Z`).getUTCDay()
      ]
      const [datePart] = formatted.split(' ')
      return `${datePart} (${weekday})`
    }

    return formatted
  }

  // Get timezone info for display
  const getTimezoneInfo = (timezone?: string) => {
    const tz = timezone || getTimezone()
    const found = commonTimezones.find(t => t.value === tz)
    return found || { value: tz, label: tz, offset: '' }
  }

  // Convert date to user's timezone and return a Date object
  const getDateInTimezone = (date?: Date | string): Date => {
    const inputDate = date ? (typeof date === 'string' ? new Date(date) : date) : new Date()
    const userTimezone = getTimezone()

    // Create a date string in the user's timezone
    const dateFormatter = getDateTimeFormat('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    })

    // Format the date in user's timezone and parse it back
    const parts = dateFormatter.formatToParts(inputDate)
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0')
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0')
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
    const second = parseInt(parts.find(p => p.type === 'second')?.value || '0')

    return new Date(year, month, day, hour, minute, second)
  }

  // Get today's date in user's timezone as YYYY-MM-DD string
  const getTodayDateString = (): string => {
    return getUserTodayYmd(getTimezone())
  }

  // Format date using user's locale and timezone
  const formatLocaleDate = (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const userTimezone = getTimezone()

    return formatUserDateTime(dateObj, {
      timezone: userTimezone,
      locale: getLocale(),
      format: {
        ...(options?.dateStyle || options?.timeStyle ? {} : { year: 'numeric', month: 'long', day: 'numeric' }),
        ...options,
      },
    })
  }

  // Format date and time using user's locale and timezone
  const formatLocaleDateTime = (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const userTimezone = getTimezone()

    return formatUserDateTime(dateObj, {
      timezone: userTimezone,
      locale: getLocale(),
      format: {
        ...(options?.dateStyle || options?.timeStyle ? {} : {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        ...options,
      },
    })
  }

  // Format time only using user's locale and timezone
  const formatLocaleTime = (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const userTimezone = getTimezone()

    return formatUserDateTime(dateObj, {
      timezone: userTimezone,
      locale: getLocale(),
      format: { hour: '2-digit', minute: '2-digit', ...options },
    })
  }

  return {
    commonTimezones,
    detectLocalTimezone,
    getTimezone,
    setTimezone,
    formatDateInTimezone,
    getTimezoneInfo,
    getDateInTimezone,
    getTodayDateString,
    formatLocaleDate,
    formatLocaleDateTime,
    formatLocaleTime
  }
}
