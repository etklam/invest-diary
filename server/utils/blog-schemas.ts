import { z } from 'zod'
import { generateExcerpt } from '~/lib/blog'
import { CATEGORY_OPTIONS, normalizeCategory } from '~/types/blog'
import { normalizeInput, normalizedRequiredString, optionalNormalizedString } from '~/server/utils/validation'

const BLOG_STATUS_VALUES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
const blogCategorySet = new Set(CATEGORY_OPTIONS)
const tagPattern = /^[\p{L}\p{N}\s-]+$/u

function normalizeTags(value: string[] | string | null | undefined, ctx: z.RefinementCtx): string | undefined {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []

  const tags = rawTags
    .map((tag) => normalizeInput(tag))
    .filter(Boolean)

  if (tags.length > 20) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Tags must contain at most 20 items',
      path: ['tags'],
    })
    return z.NEVER
  }

  for (const tag of tags) {
    if (tag.length > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each tag must be at most 50 characters',
        path: ['tags'],
      })
      return z.NEVER
    }

    if (!tagPattern.test(tag)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tags may only contain letters, numbers, spaces, and hyphens',
        path: ['tags'],
      })
      return z.NEVER
    }
  }

  const serialized = tags.join(',')
  return serialized.length > 0 ? serialized : undefined
}

const categorySchema = z.string()
  .transform(normalizeInput)
  .transform((value) => normalizeCategory(value))
  .refine((value): value is typeof CATEGORY_OPTIONS[number] => blogCategorySet.has(value as typeof CATEGORY_OPTIONS[number]), {
    message: 'Invalid category',
  })

const coverImageSchema = optionalNormalizedString(500)
  .refine((value) => value === undefined || value.startsWith('/') || URL.canParse(value), {
    message: 'Cover image must be an absolute URL or site-relative path',
  })

export const blogPostInputSchema = z.object({
  title: normalizedRequiredString('Title', 255),
  content: normalizedRequiredString('Content', 100000),
  excerpt: optionalNormalizedString(1000),
  coverImage: coverImageSchema,
  category: categorySchema,
  tags: z.union([z.string(), z.array(z.string()), z.null(), z.undefined()])
    .transform((value, ctx) => normalizeTags(value, ctx)),
  status: z.enum(BLOG_STATUS_VALUES).default('DRAFT'),
})

export type BlogPostInput = z.infer<typeof blogPostInputSchema>

export function resolveExcerpt(input: BlogPostInput): string {
  return input.excerpt || generateExcerpt(input.content)
}
