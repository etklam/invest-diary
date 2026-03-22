import { parseDiaryTags } from '~/lib/diary-tags'

export function attachDiaryTags<T extends { tagsString?: string | null }>(diary: T): T & { tags: string[] } {
  return {
    ...diary,
    tags: parseDiaryTags(diary.tagsString),
  }
}
