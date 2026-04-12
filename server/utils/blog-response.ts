const serializeId = (value: unknown) => {
  return typeof value === 'bigint' ? value.toString() : value
}

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
  const serialized: BlogRecord = {
    ...post,
    id: serializeId(post.id),
  }

  if (post.author) {
    serialized.author = {
      ...post.author,
      id: serializeId(post.author.id),
    }
  }

  return serialized
}

export function serializeBlogPosts<T extends BlogRecord>(posts: T[]) {
  return posts.map((post) => serializeBlogPost(post))
}
