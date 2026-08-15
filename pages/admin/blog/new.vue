<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {{ $t('blog.createPost') }}
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        {{ $t('blog.createDescription') }}
      </p>
    </div>

    <!-- Form -->
    <form @submit.prevent="createPost" class="space-y-8">
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
                {{ $t('blog.saveAsDraft') }}
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
                {{ $t('blog.publish') }}
              </span>
            </label>
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
            type="button"
            @click="saveAsDraft"
            :disabled="loading"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            <i-heroicons-document class="mr-2 h-5 w-5" />
            {{ $t('blog.saveAsDraft') }}
          </button>
          <button
            type="submit"
            :disabled="loading || !isFormValid"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i-svg-spinners-180-ring-with-bg v-if="loading" class="mr-2 h-5 w-5" />
            <i-heroicons-check v-else class="mr-2 h-5 w-5" />
            {{ form.status === 'PUBLISHED' ? $t('blog.publish') : $t('common.save') }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { resolveErrorMessage } from '~/composables/useErrorI18n'
import { useBlogDraft } from '~/composables/useBlogDraft'

const { t } = useI18n()
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
const {
  hasDraft,
  persistDraft,
  persistDraftNow,
  restoreDraft,
  clearDraft,
  enableAutosave,
  disableAutosave,
} = useBlogDraft(draftKey, {
  onPersist: () => toast.success(t('blog.draftSaved')),
})

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

watch(
  () => [form.value.title, form.value.content],
  () => {
    persistDraft(form.value)
  }
)

// Create post
const createPost = async () => {
  if (!isFormValid.value) {
    toast.error(t('blog.validationRequired'))
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

    toast.success(form.value.status === 'PUBLISHED' ? t('blog.publishSuccess') : t('blog.saveDraftSuccess'))

    if (form.value.status === 'PUBLISHED') {
      clearDraft()
    }
    disableAutosave()

    // Redirect to edit page or list
    if (form.value.status === 'PUBLISHED') {
      router.push('/admin/blog')
    } else {
      router.push('/admin/blog')
    }
  } catch (error: any) {
    console.error('Failed to create post:', error)
    toast.error(resolveErrorMessage(error, t, t('blog.createFailed')))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (hasDraft.value) {
    const restoredDraft = restoreDraft(confirm(t('blog.draftRestorePrompt')))
    if (restoredDraft) {
      form.value = {
        ...form.value,
        ...restoredDraft,
      }
    }
  }
  enableAutosave()
})

onBeforeUnmount(() => {
  persistDraftNow(form.value)
  disableAutosave()
})
</script>
