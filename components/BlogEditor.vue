<template>
  <div class="space-y-6">
    <div>
      <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.title') }} <span class="text-red-500">*</span>
      </label>
      <div class="mt-1">
        <input
          id="title"
          v-model="localTitle"
          type="text"
          name="title"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          :placeholder="$t('blog.titlePlaceholder')"
        />
      </div>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ $t('blog.slug') }}: {{ slugPreview }}
      </p>
    </div>

    <div class="editor-shell rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ $t('blog.content') }} <span class="text-red-500">*</span>
          </label>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Markdown + GFM
          </p>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ $t('blog.richTextSupported') || '支援富文本格式' }}
        </p>
      </div>

      <ClientOnly>
        <MdEditor
          v-model="localContent"
          class="mt-4"
          editor-id="blog-markdown-editor"
          :theme="editorTheme"
          preview-theme="github"
          code-theme="github"
          :toolbars="toolbars"
          :sanitize="sanitizePreview"
          :on-upload-img="handleUploadImages"
          :placeholder="editorPlaceholder"
          :auto-detect-code="true"
          :show-code-row-number="false"
          no-mermaid
        />
      </ClientOnly>
    </div>

    <div>
      <label for="excerpt" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.excerpt') }}
      </label>
      <div class="mt-1">
        <textarea
          id="excerpt"
          v-model="localExcerpt"
          name="excerpt"
          rows="3"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          :placeholder="$t('blog.excerptPlaceholder')"
        />
      </div>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ $t('blog.excerptOptional') }}
      </p>
    </div>

    <div>
      <label for="coverImage" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.coverImage') }}
      </label>
      <div class="mt-1">
        <input
          id="coverImage"
          v-model="localCoverImage"
          type="url"
          name="coverImage"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          :placeholder="$t('blog.coverImagePlaceholder')"
        />
      </div>
    </div>

    <div>
      <label for="category" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.category') }} <span class="text-red-500">*</span>
      </label>
      <div class="mt-1">
        <select
          id="category"
          v-model="localCategory"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">{{ $t('blog.selectCategory') }}</option>
          <option v-for="cat in CATEGORY_OPTIONS" :key="cat" :value="cat">
            {{ $t(`blog.categories.${cat}`) }}
          </option>
        </select>
      </div>
    </div>

    <div>
      <label for="tags" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.tags') }}
      </label>
      <div class="mt-1">
        <input
          id="tags"
          v-model="localTags"
          type="text"
          name="tags"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          :placeholder="$t('blog.tagsPlaceholder')"
        />
      </div>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ $t('blog.tagsHint') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import 'md-editor-v3/lib/style.css'
import DOMPurify from 'dompurify'
import type { Config as DOMPurifyConfig } from 'dompurify'
import { MdEditor } from 'md-editor-v3'
import { computed } from 'vue'
import { generateSlug } from '~/lib/blog'
import { CATEGORY_OPTIONS } from '~/types/blog'

const { t } = useI18n()
const toast = useToast()
const colorMode = useColorMode()

const props = defineProps<{
  title: string
  content: string
  excerpt?: string | null
  coverImage?: string | null
  category: string
  tags?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'update:content', value: string): void
  (e: 'update:excerpt', value: string): void
  (e: 'update:coverImage', value: string): void
  (e: 'update:category', value: string): void
  (e: 'update:tags', value: string): void
}>()

const MIN_IMAGE_SIZE_MB = 2
const MAX_IMAGE_SIZE_MB = 5
const BYTES_PER_MB = 1024 * 1024

const htmlSanitizeConfig: DOMPurifyConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr', 'span', 'div'
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'class'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|data:image\/(?:png|jpe?g|gif|webp|svg\+xml);)/i
}

const toolbars = [
  'bold',
  'underline',
  'italic',
  '-',
  'title',
  'strikeThrough',
  'sub',
  'sup',
  'quote',
  'unorderedList',
  'orderedList',
  'task',
  '-',
  'codeRow',
  'code',
  'link',
  'image',
  'table',
  '=',
  'pageFullscreen',
  'fullscreen',
  'preview',
  'htmlPreview',
  'catalog'
] as const

const localTitle = computed({
  get: () => props.title,
  set: (value) => emit('update:title', value)
})

const localContent = computed({
  get: () => props.content,
  set: (value) => emit('update:content', value)
})

const localExcerpt = computed({
  get: () => props.excerpt || '',
  set: (value) => emit('update:excerpt', value)
})

const localCoverImage = computed({
  get: () => props.coverImage || '',
  set: (value) => emit('update:coverImage', value)
})

const localCategory = computed({
  get: () => props.category,
  set: (value) => emit('update:category', value)
})

const localTags = computed({
  get: () => props.tags || '',
  set: (value) => emit('update:tags', value)
})

const editorTheme = computed(() => colorMode.value === 'dark' ? 'dark' : 'light')
const slugPreview = computed(() => localTitle.value ? generateSlug(localTitle.value) : '')
const editorPlaceholder = computed(() => `${t('blog.content')}\n\n# 標題\n\n- 重點一\n- 重點二`)

const sanitizePreview = (html: string) => {
  if (typeof DOMPurify?.sanitize !== 'function') {
    return html
  }
  return DOMPurify.sanitize(html, htmlSanitizeConfig)
}

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => {
    const result = typeof reader.result === 'string' ? reader.result : ''
    if (!result) {
      reject(new Error('圖片上傳失敗'))
      return
    }
    resolve(result)
  }
  reader.onerror = () => reject(new Error('圖片上傳失敗'))
  reader.readAsDataURL(file)
})

const handleUploadImages = async (files: File[], callback: (urls: string[]) => void) => {
  const validFiles: File[] = []

  for (const file of files) {
    const sizeMb = file.size / BYTES_PER_MB
    if (sizeMb < MIN_IMAGE_SIZE_MB || sizeMb > MAX_IMAGE_SIZE_MB) {
      toast.error(`圖片大小需介於 ${MIN_IMAGE_SIZE_MB}MB ~ ${MAX_IMAGE_SIZE_MB}MB`)
      return
    }
    validFiles.push(file)
  }

  try {
    const urls = await Promise.all(validFiles.map(readFileAsDataUrl))
    callback(urls)
  } catch {
    toast.error('圖片上傳失敗')
  }
}
</script>

<style scoped>
.editor-shell {
  box-shadow: 0 14px 30px rgb(15 23 42 / 8%);
}

:deep(.md-editor) {
  margin-top: 1rem;
  min-height: 560px;
}

:deep(.md-editor-toolbar) {
  border-top-left-radius: 0.75rem;
  border-top-right-radius: 0.75rem;
}

:deep(.md-editor-content) {
  min-height: 500px;
}
</style>
