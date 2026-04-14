<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-semibold text-copy mb-2">
        {{ $t('blog.createPost') }}
      </h1>
      <p class="text-copy-muted">
        建立新的投資教學文章
      </p>
    </div>

    <!-- Form -->
    <form @submit.prevent="createPost" class="space-y-8">
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
                {{ $t('blog.saveAsDraft') }}
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
                {{ $t('blog.publish') }}
              </span>
            </label>
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
            type="button"
            variant="ghost"
            @click="saveAsDraft"
            :disabled="loading"
          >
            <Icon name="lucide:file" class="mr-2 h-4 w-4" />
            {{ $t('blog.saveAsDraft') }}
          </BaseButton>
          <BaseButton
            type="submit"
            :disabled="loading || !isFormValid"
            :loading="loading"
          >
            <Icon name="lucide:check" class="mr-2 h-4 w-4" />
            {{ form.status === 'PUBLISHED' ? $t('blog.publish') : $t('common.save') }}
          </BaseButton>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn, useLocalStorage } from '@vueuse/core'

const toast = useToast()
const router = useRouter()

definePageMeta({
  middleware: 'admin',
  requiresAuth: true,
})

// Form state
const form = ref({
  title: '',
  content: '',
  excerpt: '',
  coverImage: '',
  category: '',
  tags: '',
  status: 'DRAFT'
})

const loading = ref(false)
const draftKey = 'blog-draft:new'
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

// Form validation
const isFormValid = computed(() => {
  return form.value.title.trim() !== '' &&
         form.value.content.trim() !== '' &&
         form.value.category !== ''
})

// Save as draft
const saveAsDraft = async () => {
  form.value.status = 'DRAFT'
  await createPost()
}

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

// Create post
const createPost = async () => {
  if (!isFormValid.value) {
    toast.error('請填寫標題、內容和分類')
    return
  }

  try {
    loading.value = true

    await $fetch('/api/blog', {
      method: 'POST',
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

    toast.success(form.value.status === 'PUBLISHED' ? '文章已發布' : '文章已儲存為草稿')

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

    // Redirect to edit page or list
    if (form.value.status === 'PUBLISHED') {
      router.push('/admin/blog')
    } else {
      router.push('/admin/blog')
    }
  } catch (error: any) {
    console.error('Failed to create post:', error)
    toast.error(error.data?.statusMessage || '建立失敗')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const hasDraft = draft.value.title || draft.value.content
  if (hasDraft) {
    const shouldRestore = confirm('偵測到尚未發布的草稿，是否恢復？')
    if (shouldRestore) {
      form.value = {
        ...form.value,
        title: draft.value.title || '',
        content: draft.value.content || '',
        excerpt: draft.value.excerpt || '',
        coverImage: draft.value.coverImage || '',
        category: draft.value.category || '',
        tags: draft.value.tags || '',
        status: draft.value.status || 'DRAFT'
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
})

onBeforeUnmount(() => {
  readyForAutosave.value = false
  if (persistDraft && typeof persistDraft === 'function') {
    persistDraft()
  }
})
</script>
