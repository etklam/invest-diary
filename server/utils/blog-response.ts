import { serialize } from '~/server/utils/serialize'

type BlogAuthor = {
  id: unknown
  [key: string]: unknown
}

type BlogRecord = {
  id: unknown
  author?: BlogAuthor | null
  [key: string]: unknown
}

export function serializeBlogPost<T extends BlogRecord>(post: T) {
  return serialize(post)
}

export function serializeBlogPosts<T extends BlogRecord>(posts: T[]) {
  return posts.map(serialize)
}
