<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Loading Skeleton -->
    <div v-if="loading" class="space-y-6">
      <div class="space-y-2">
        <BaseSkeleton variant="text" class="w-64 h-8" />
        <BaseSkeleton variant="text" class="w-40" />
      </div>
      <BaseCard class="p-6 space-y-4">
        <BaseSkeleton variant="text" class="w-full h-10" />
        <BaseSkeleton variant="text" class="w-full h-64" />
        <BaseSkeleton variant="text" class="w-1/2 h-10" />
      </BaseCard>
    </div>

    <!-- Error -->
    <BaseAlert v-else-if="error" variant="error">
      <p class="font-medium">{{ $t('blog.loadFailed') }}</p>
    </BaseAlert>

    <!-- Form -->
    <div v-else>
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-semibold text-copy mb-2">
          {{ $t('blog.editPost') }}
        </h1>
        <p class="text-copy-muted">
          編輯文章內容
        </p>
      </div>

      <form @submit.prevent="updatePost" class="space-y-8">
        <BaseCard class="p-6">
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
            <label class="block text-sm font-medium text-copy-secondary mb-2">
              {{ $t('blog.postStatus') }}
            </label>
            <div class="flex gap-4">
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="form.status"
                  value="DRAFT"
                  class="h-4 w-4 text-accent border-line focus:ring-accent"
                />
                <span class="ml-2 text-sm text-copy-secondary">
                  {{ $t('blog.postStatuses.draft') }}
                </span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="form.status"
                  value="PUBLISHED"
                  class="h-4 w-4 text-accent border-line focus:ring-accent"
                />
                <span class="ml-2 text-sm text-copy-secondary">
                  {{ $t('blog.postStatuses.published') }}
                </span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="form.status"
                  value="ARCHIVED"
                  class="h-4 w-4 text-accent border-line focus:ring-accent"
                />
                <span class="ml-2 text-sm text-copy-secondary">
                  {{ $t('blog.postStatuses.archived') }}
                </span>
              </label>
            </div>
          </div>

          <!-- Current Info -->
          <div class="mt-6 p-4 bg-surface-alt border border-line">
            <div class="text-sm text-copy-muted">
              <div>Slug: <code class="bg-surface px-2 py-1 border border-line font-mono text-xs">{{ form.slug }}</code></div>
              <div class="mt-1">
                {{ $t('blog.createdAt') }}: {{ formatDate(post.createdAt) }}
              </div>
              <div v-if="post.publishedAt">
                {{ $t('blog.publishedAt') }}: {{ formatDate(post.publishedAt) }}
              </div>
            </div>
          </div>
        </BaseCard>

        <!-- Actions -->
        <div class="flex justify-between items-center">
          <NuxtLink to="/admin/blog">
            <BaseButton variant="secondary">
              <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
              {{ $t('common.cancel') }}
            </BaseButton>
          </NuxtLink>

          <div class="flex gap-3">
            <BaseButton
              type="submit"
              :disabled="saving || !isFormValid"
              :loading="saving"
            >
              <Icon name="lucide:check" class="mr-2 h-4 w-4" />
              {{ $t('common.save') }}
            </BaseButton>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn, useLocalStorage } from '@vueuse/core'
import { formatDate } from '~/lib/utils'
const toast = useToast()
const router = useRouter()
const route = useRoute()

definePageMeta({
  middleware: 'admin',
  requiresAuth: true,
})

const postId = route.params.id as string
const draftKey = `blog-draft:${postId}`
const draft = useLocalStorage(draftKey, {
  title: '',
  content: '',
  excerpt: '',
  coverImage: '',
  category: '',
  tags: '',
  status: 'DRAFT',
  savedAt: ''
})
const readyForAutosave = ref(false)

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

const persistDraft = useDebounceFn(() => {
  if (!readyForAutosave.value) return
  draft.value = {
    ...draft.value,
    ...form.value,
    savedAt: new Date().toISOString()
  }
  toast.success('草稿已儲存')
}, 5000)

watch(
  () => [form.value.title, form.value.content],
  () => {
    persistDraft()
  }
)

// Fetch post
const fetchPost = async () => {
  try {
    loading.value = true
    const foundPost = await $fetch(`/api/blog/admin/${postId}`) as any
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

    const hasDraft = draft.value.title || draft.value.content
    if (hasDraft) {
      const shouldRestore = confirm('偵測到尚未發布的草稿，是否恢復？')
      if (shouldRestore) {
        form.value = {
          ...form.value,
          title: draft.value.title || form.value.title,
          content: draft.value.content || form.value.content,
          excerpt: draft.value.excerpt || form.value.excerpt,
          coverImage: draft.value.coverImage || form.value.coverImage,
          category: draft.value.category || form.value.category,
          tags: draft.value.tags || form.value.tags,
          status: draft.value.status || form.value.status
        }
      } else {
        draft.value = {
          title: '',
          content: '',
          excerpt: '',
          coverImage: '',
          category: '',
          tags: '',
          status: 'DRAFT',
          savedAt: ''
        }
      }
    }
    readyForAutosave.value = true
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
    if (form.value.status === 'PUBLISHED') {
      draft.value = {
        title: '',
        content: '',
        excerpt: '',
        coverImage: '',
        category: '',
        tags: '',
        status: 'DRAFT',
        savedAt: ''
      }
    }
    readyForAutosave.value = false
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

onBeforeUnmount(() => {
  readyForAutosave.value = false
  if (persistDraft && typeof persistDraft === 'function') {
    persistDraft()
  }
})
</script>
