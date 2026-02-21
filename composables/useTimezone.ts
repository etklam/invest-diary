/**
 * Timezone composable for managing user timezone preferences
 */
export const useTimezone = () => {
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

  // Get timezone from localStorage or use detected/local timezone
  const getTimezone = (): string => {
    if (process.client) {
      const stored = localStorage.getItem('user_timezone')
      if (stored) return stored
    }
    return 'Asia/Taipei' // Default to Taipei timezone
  }

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

    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }

    if (format === 'full') {
      formatOptions.hour = '2-digit'
      formatOptions.minute = '2-digit'
    }

    const formatted = new Intl.DateTimeFormat('zh-TW', formatOptions).format(dateObj)

    // Add weekday for 'weekday' format
    if (format === 'weekday') {
      const weekdays = ['日', '一', '二', '三', '四', '五', '六']
      const weekday = weekdays[dateObj.getDay()]
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

  return {
    commonTimezones,
    detectLocalTimezone,
    getTimezone,
    setTimezone,
    formatDateInTimezone,
    getTimezoneInfo
  }
}
