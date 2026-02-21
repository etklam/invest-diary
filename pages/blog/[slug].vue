<template>
  <div class="mx-auto w-full max-w-4xl px-4 py-4 sm:py-8 bg-gray-950 text-gray-100">
    <div v-if="pending" class="mx-auto w-full max-w-3xl animate-pulse">
      <div class="mb-8 h-64 rounded-lg bg-gray-800" />
      <div class="mb-4 h-6 w-1/3 rounded bg-gray-800" />
      <div class="mb-6 h-10 w-3/4 rounded bg-gray-800" />
      <div class="space-y-3">
        <div class="h-4 w-full rounded bg-gray-800" />
        <div class="h-4 w-11/12 rounded bg-gray-800" />
        <div class="h-4 w-10/12 rounded bg-gray-800" />
        <div class="h-4 w-9/12 rounded bg-gray-800" />
      </div>
    </div>

    <div
      v-else-if="error"
      class="mx-auto w-full max-w-3xl rounded-lg border border-red-800/50 bg-red-900/20 p-4"
    >
      <div class="flex items-start gap-3">
        <i-heroicons-x-circle class="h-5 w-5 text-red-400" />
        <h3 class="text-sm font-medium text-red-300">
          {{ $t('blog.postNotFound') }}
        </h3>
      </div>
    </div>

    <article v-else-if="post" class="mx-auto w-full max-w-3xl">
      <div v-if="isAdmin" class="mb-6 flex w-full flex-wrap justify-center gap-2 sm:justify-end">
        <NuxtLink
          :to="`/admin/blog/${post.id}/edit`"
          class="btn btn-indigo"
        >
          <i-heroicons-pencil class="btn-icon" />
          <span class="btn-label">編輯文章</span>
        </NuxtLink>
        <button
          class="btn btn-red"
          @click="handleDelete"
        >
          <i-heroicons-trash class="btn-icon" />
          <span class="btn-label">刪除文章</span>
        </button>
      </div>

      <nav class="mb-6 text-sm">
        <ol class="flex items-center space-x-2 text-gray-500">
          <li>
            <NuxtLink to="/" class="transition-colors hover:text-gray-300">
              {{ $t('common.appName') }}
            </NuxtLink>
          </li>
          <li class="text-gray-700">/</li>
          <li>
            <NuxtLink to="/blog" class="transition-colors hover:text-gray-300">
              {{ $t('blog.title') }}
            </NuxtLink>
          </li>
          <li class="text-gray-700">/</li>
          <li class="max-w-[200px] truncate font-medium text-gray-200">
            {{ post.title }}
          </li>
        </ol>
      </nav>

      <div
        v-if="post.coverImage"
        class="mb-8 overflow-hidden rounded-lg border border-gray-700/50 bg-gray-900"
      >
        <NuxtImg
          :src="post.coverImage"
          :alt="post.title"
          width="1200"
          height="675"
          format="webp"
          loading="eager"
          class="max-h-[500px] w-full object-cover"
        />
      </div>

      <header class="mb-6">
        <div class="mb-4">
          <span
            class="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/20 px-3 py-1 text-sm font-medium text-indigo-300"
          >
            {{ $t(`blog.categories.${categoryKey}`) || post.category }}
          </span>
        </div>

        <h1 class="mb-3 text-2xl font-bold leading-snug text-white sm:text-3xl lg:text-4xl">
          {{ post.title }}
        </h1>

        <PostMeta
          :author="post.author.name || post.author.email"
          :date="post.publishedAt!"
          :reading-time="readingTime"
        />

        <div v-if="parsedTags.length > 0" class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="tag in parsedTags"
            :key="tag"
            class="inline-flex items-center rounded-full border border-gray-700/50 bg-gray-800/80 px-3 py-1 text-sm text-gray-300"
          >
            #{{ tag }}
          </span>
        </div>
      </header>

      <div class="mb-6 rounded-xl border border-gray-800 bg-gray-900/60 p-4 sm:p-6">
        <div
          class="prose prose-lg prose-gray dark:prose-invert max-w-none
          prose-headings:font-semibold prose-headings:text-gray-100 prose-headings:scroll-mt-20
          prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-6
          prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-5
          prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4
          prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
          prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
          prose-strong:text-gray-100 prose-strong:font-semibold
          prose-em:text-gray-200
          prose-code:text-pink-400 prose-code:bg-gray-800/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-[''] prose-code:font-mono
          prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-800 prose-pre:rounded-lg prose-pre:shadow-lg
          prose-pre:px-4 prose-pre:py-4 prose-pre:my-6
          prose-ul:text-gray-300 prose-ul:ml-4
          prose-ol:text-gray-300 prose-ol:ml-4
          prose-li:text-gray-300 prose-li:marker:text-gray-500
          prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-gray-800/30 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:italic prose-blockquote:text-gray-300 prose-blockquote:rounded-r-lg
          prose-hr:border-gray-700 prose-hr:my-8
          prose-img:rounded-lg prose-img:shadow-xl prose-img:my-6
          prose-table:border-collapse prose-table:my-6 prose-table:w-full
          prose-thead:border-b prose-thead:border-gray-700 prose-thead:bg-gray-800/50
          prose-th:text-gray-100 prose-th:font-semibold prose-th:px-4 prose-th:py-3
          prose-td:text-gray-300 prose-td:border-b prose-td:border-gray-800 prose-td:px-4 prose-td:py-3
          prose-tr:hover:prose-td:bg-gray-800/30"
        >
          <MDC :value="post.content" />
        </div>
      </div>

      <div class="mb-6 rounded-xl border border-gray-800 bg-gray-900/60 p-4 sm:p-6">
        <h3 class="mb-4 text-lg font-semibold text-gray-100">
          {{ $t('blog.share') }}
        </h3>

        <div class="flex w-full flex-wrap items-center justify-center gap-4">
          <button class="btn btn-gray" @click="copyLink">
            <i-heroicons-link class="btn-icon" />
            <span class="btn-label">{{ $t('blog.copyLink') }}</span>
          </button>

          <span v-if="copied" class="flex items-center gap-1 text-sm text-green-400">
            <i-heroicons-check-circle class="h-4 w-4" />
            {{ $t('blog.linkCopied') }}
          </span>
        </div>
      </div>

      <div class="flex w-full items-center justify-center pb-8">
        <NuxtLink to="/blog" class="btn btn-indigo">
          <i-heroicons-arrow-left class="btn-icon" />
          <span class="btn-label">{{ $t('blog.backToList') }}</span>
        </NuxtLink>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
// Blog posts are public
definePageMeta({
  requiresAuth: false
})

import { calculateReadingTime, parseTags } from '~/lib/blog'
import { usePerformance } from '~/composables/usePerformance'

interface Post {
  id: string | number
  title: string
  slug: string
  excerpt?: string | null
  coverImage?: string | null
  category: string
  tags?: string | null
  publishedAt: Date | string
  content: string
  author: {
    id: string | number
    name: string | null
    email: string
  }
}

const route = useRoute()
const { t } = useI18n()
const { isAdmin } = useAuth()
const copied = ref(false)
const toast = useToast()
const router = useRouter()

const { data: post, pending, error } = await useAsyncData(`blog-${route.params.slug}`, () =>
  $fetch<Post>(`/api/blog/${route.params.slug}`)
)

usePerformance()

const readingTime = computed(() => (post.value ? calculateReadingTime(post.value.content) : 0))
const parsedTags = computed(() => (post.value ? parseTags(post.value.tags) : []))

const categoryKey = computed(() => {
  if (!post.value) return ''
  const categoryMap: Record<string, string> = {
    '基本面分析': 'fundamental',
    '技术面分析': 'technical',
    '市場觀察': 'market',
    '市场观察': 'market',
    '投資策略': 'strategy',
    '投资策略': 'strategy',
    'Fundamental Analysis': 'fundamental',
    'Technical Analysis': 'technical',
    'Market Watch': 'market',
    'Investment Strategy': 'strategy',
  }
  return categoryMap[post.value.category] || post.value.category
})

useHead(() => ({
  title: post.value ? `${post.value.title} - 投資教學` : '文章載入中',
  meta: post.value
    ? [
        { name: 'description', content: post.value.excerpt || t('blog.description') },
        { property: 'og:title', content: post.value.title },
        { property: 'og:description', content: post.value.excerpt || t('blog.description') },
        { property: 'og:type', content: 'article' },
        { property: 'og:image', content: post.value.coverImage || '' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ]
    : [],
}))

const copyLink = async () => {
  const url = window.location.href
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy link:', err)
  }
}

const handleDelete = async () => {
  if (!post.value) return
  if (!confirm(`確定要刪除文章「${post.value.title}」嗎？此操作無法復原。`)) return

  try {
    await $fetch(`/api/blog/${post.value.id}`, { method: 'DELETE' })
    toast.success('文章已刪除')
    await router.push('/blog')
  } catch (apiError: any) {
    console.error('Failed to delete post:', apiError)
    toast.error(apiError.data?.statusMessage || '刪除失敗')
  }
}
</script>

<style scoped>
.btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  border-radius: 0.5rem;
  border-width: 1px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  text-decoration: none;
}

.btn-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  height: 1.25rem;
  width: 1.25rem;
  transform: translateY(-50%);
  pointer-events: none;
}

.btn-label {
  display: block;
  text-align: center;
}

.btn-indigo {
  min-width: 9.5rem;
  padding: 0.625rem 1rem;
  border-color: rgb(99 102 241 / 0.3);
  background-color: rgb(99 102 241 / 0.2);
  color: rgb(199 210 254);
}

.btn-indigo:hover {
  background-color: rgb(99 102 241 / 0.3);
}

.btn-red {
  min-width: 9.5rem;
  padding: 0.625rem 1rem;
  border-color: rgb(239 68 68 / 0.3);
  background-color: rgb(239 68 68 / 0.2);
  color: rgb(254 202 202);
}

.btn-red:hover {
  background-color: rgb(239 68 68 / 0.3);
}

.btn-gray {
  min-width: 9.5rem;
  padding: 0.625rem 1rem;
  border-color: rgb(55 65 81 / 1);
  background-color: rgb(31 41 55 / 1);
  color: rgb(229 231 235);
}

.btn-gray:hover {
  background-color: rgb(55 65 81 / 1);
}
</style>
