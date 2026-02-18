<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <i-svg-spinners-180-ring-with-bg class="h-8 w-8 text-indigo-600" />
      <p class="mt-2 text-gray-500 dark:text-gray-400">{{ $t('common.loading') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
      <div class="flex">
        <div class="flex-shrink-0">
          <i-heroicons-x-circle class="h-5 w-5 text-red-400" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
            {{ $t('blog.loadFailed') }}
          </h3>
        </div>
      </div>
    </div>

    <!-- Form -->
    <div v-else>
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {{ $t('blog.editPost') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          編輯文章內容
        </p>
      </div>

      <form @submit.prevent="updatePost" class="space-y-8">
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <BlogEditor
            v-model:title="form.title"
            v-model:content="form.content"
            v-model:excerpt="form.excerpt"
            v-model:coverImage="form.coverImage"
            v-model:category="form.category"
            v-model:tags="form.tags"
          />

          <!-- Status Selection -->
          <div class="mt-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ $t('blog.postStatus') }}
            </label>
            <div class="flex gap-4">
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="form.status"
                  value="DRAFT"
                  class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                />
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {{ $t('blog.postStatuses.draft') }}
                </span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="form.status"
                  value="PUBLISHED"
                  class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                />
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {{ $t('blog.postStatuses.published') }}
                </span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="form.status"
                  value="ARCHIVED"
                  class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                />
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {{ $t('blog.postStatuses.archived') }}
                </span>
              </label>
            </div>
          </div>

          <!-- Current Info -->
          <div class="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              <div>Slug: <code class="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">{{ form.slug }}</code></div>
              <div class="mt-1">
                {{ $t('blog.createdAt') }}: {{ formatDate(post.createdAt) }}
              </div>
              <div v-if="post.publishedAt">
                {{ $t('blog.publishedAt') }}: {{ formatDate(post.publishedAt) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-between items-center">
          <NuxtLink
            to="/admin/blog"
            class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <i-heroicons-arrow-left class="mr-2 h-5 w-5" />
            {{ $t('common.cancel') }}
          </NuxtLink>

          <div class="flex gap-3">
            <button
              type="submit"
              :disabled="saving || !isFormValid"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i-svg-spinners-180-ring-with-bg v-if="saving" class="mr-2 h-5 w-5" />
              <i-heroicons-check v-else class="mr-2 h-5 w-5" />
              {{ $t('common.save') }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from '~/lib/utils'

const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const postId = route.params.id as string

// State
const post = ref<any>(null)
const loading = ref(true)
const error = ref<any>(null)
const saving = ref(false)

// Form state
const form = ref({
  title: '',
  content: '',
  excerpt: '',
  coverImage: '',
  category: '',
  tags: '',
  status: 'DRAFT',
  slug: ''
})

// Form validation
const isFormValid = computed(() => {
  return form.value.title.trim() !== '' &&
         form.value.content.trim() !== '' &&
         form.value.category !== ''
})

// Fetch post
const fetchPost = async () => {
  try {
    loading.value = true
    const response = await $fetch(`/api/blog/admin`) as any
    const foundPost = response.data.find((p: any) => p.id.toString() === postId)

    if (!foundPost) {
      error.value = { message: 'Post not found' }
      return
    }

    post.value = foundPost
    form.value = {
      title: foundPost.title,
      content: foundPost.content,
      excerpt: foundPost.excerpt || '',
      coverImage: foundPost.coverImage || '',
      category: foundPost.category,
      tags: foundPost.tags || '',
      status: foundPost.status,
      slug: foundPost.slug
    }
  } catch (err: any) {
    console.error('Failed to fetch post:', err)
    error.value = err
  } finally {
    loading.value = false
  }
}

// Update post
const updatePost = async () => {
  if (!isFormValid.value) {
    toast.error('請填寫標題、內容和分類')
    return
  }

  try {
    saving.value = true

    await $fetch(`/api/blog/${postId}`, {
      method: 'PUT',
      body: {
        title: form.value.title,
        content: form.value.content,
        excerpt: form.value.excerpt || undefined,
        coverImage: form.value.coverImage || undefined,
        category: form.value.category,
        tags: form.value.tags || undefined,
        status: form.value.status
      }
    })

    toast.success('文章已更新')
    router.push('/admin/blog')
  } catch (err: any) {
    console.error('Failed to update post:', err)
    toast.error(err.data?.statusMessage || '更新失敗')
  } finally {
    saving.value = false
  }
}

// Fetch post on mount
onMounted(() => {
  fetchPost()
})
</script>
