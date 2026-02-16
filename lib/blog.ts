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

/**
 * Generate excerpt from content (removes Markdown syntax)
 */
export function generateExcerpt(content: string, maxLength = 150): string {
  const plainText = content
    .replace(/[#*`_\[\]]/g, '') // Remove Markdown characters
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
  const wordsPerMinute = 200
  const wordCount = content.length
  return Math.ceil(wordCount / wordsPerMinute)
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
