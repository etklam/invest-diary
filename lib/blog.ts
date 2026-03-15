/**
 * Generate URL-friendly slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, '') // Keep alphanumeric, Chinese characters, spaces, and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

const stripHtml = (input: string): string => {
  return input.replace(/<[^>]*>/g, ' ')
}

export function looksLikeHtmlContent(content: string | null | undefined): boolean {
  if (!content) return false
  return /<\/?[a-z][\w:-]*(?:\s[^<>]*)?>/i.test(content)
}

/**
 * Generate excerpt from content (removes Markdown syntax)
 */
export function generateExcerpt(content: string, maxLength = 150): string {
  const plainText = stripHtml(content)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links, keep text
    .replace(/[#*`_\[\]]/g, '') // Remove other Markdown characters
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()

  return plainText.length > maxLength
    ? plainText.substring(0, maxLength) + '...'
    : plainText
}

/**
 * Calculate reading time in minutes
 */
export function calculateReadingTime(content: string): number {
  const plain = stripHtml(content).trim()
  if (!plain) return 1

  const wordsPerMinute = 200
  const cjkCharsPerMinute = 400

  const latinWords = plain.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length || 0
  const cjkChars = plain.match(/[\u3400-\u9FFF]/g)?.length || 0
  const hasWhitespace = /\s/.test(plain)

  let result = 0

  if (cjkChars === 0 && latinWords <= 1 && !hasWhitespace) {
    result = Math.ceil(plain.length / wordsPerMinute)
  } else if (latinWords > 0 || cjkChars > 0) {
    result = Math.ceil(latinWords / wordsPerMinute + cjkChars / cjkCharsPerMinute)
  } else {
    // Fallback for symbol-heavy content (e.g. code blocks).
    result = Math.ceil(plain.length / wordsPerMinute)
  }

  return result < 1 ? 1 : result
}

/**
 * Parse tags string to array
 */
export function parseTags(tagsString: string | null | undefined): string[] {
  if (!tagsString) return []
  return tagsString.split(',').map(tag => tag.trim()).filter(Boolean)
}

/**
 * Convert tags array to string
 */
export function stringifyTags(tags: string[]): string {
  return tags.join(',')
}
