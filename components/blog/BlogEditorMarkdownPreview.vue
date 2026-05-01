<template>
  <div class="editor-shell rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <BlogEditorToolbar />

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
</template>

<script setup lang="ts">
import 'md-editor-v3/lib/style.css'
import DOMPurify from 'dompurify'
import type { Config as DOMPurifyConfig } from 'dompurify'
import { MdEditor } from 'md-editor-v3'
import { computed } from 'vue'
import BlogEditorToolbar from '~/components/blog/BlogEditorToolbar.vue'

const { t } = useI18n()
const toast = useToast()
const colorMode = useColorMode()

const props = defineProps<{
  content: string
}>()

const emit = defineEmits<{
  (e: 'update:content', value: string): void
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

const toolbarPreset = [
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
const toolbars = [...toolbarPreset]

const localContent = computed({
  get: () => props.content,
  set: (value) => emit('update:content', value)
})

const editorTheme = computed(() => colorMode.value === 'dark' ? 'dark' : 'light')
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
