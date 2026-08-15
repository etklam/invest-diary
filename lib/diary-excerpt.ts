/**
 * Convert diary markdown content into the plain-text excerpt used by list views.
 */
export function stripDiaryMarkdown(content?: string | null): string {
  return (content || '').replace(/[#*\`>\-\n]/g, ' ').replace(/\s+/g, ' ').trim()
}
