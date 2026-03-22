export function normalizeDiaryTags(tags: string[] | null | undefined): string[] {
  const normalized: string[] = []
  const seen = new Set<string>()

  for (const rawTag of tags ?? []) {
    const tag = rawTag.trim()
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    normalized.push(tag)
  }

  return normalized
}

export function parseDiaryTags(tagsString: string | null | undefined): string[] {
  if (!tagsString) return []
  return normalizeDiaryTags(tagsString.split(','))
}

export function stringifyDiaryTags(tags: string[] | null | undefined): string | null {
  const normalized = normalizeDiaryTags(tags)
  return normalized.length ? normalized.join(',') : null
}
