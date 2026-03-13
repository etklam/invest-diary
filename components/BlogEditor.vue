<template>
  <div class="space-y-6">
    <div>
      <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.title') }} <span class="text-red-500">*</span>
      </label>
      <div class="mt-1">
        <input
          type="text"
          name="title"
          id="title"
          v-model="localTitle"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          :placeholder="$t('blog.titlePlaceholder')"
        />
      </div>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ $t('blog.slug') }}: {{ slugPreview }}
      </p>
    </div>

    <div class="editor-shell rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ $t('blog.content') }} <span class="text-red-500">*</span>
          </label>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ $t('blog.richTextSupported') || '支援富文本格式' }}
          </p>
        </div>
        <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>Cmd/Ctrl + B / I / K</span>
          <button
            type="button"
            class="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-600 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
            @click="syncScrollEnabled = !syncScrollEnabled"
          >
            {{ syncScrollEnabled ? ($t('blog.syncOn') || '同步滾動：開') : ($t('blog.syncOff') || '同步滾動：關') }}
          </button>
        </div>
      </div>

      <div class="editor-layout mt-4">
        <div class="editor-pane" ref="editorRoot">
          <ClientOnly>
            <QuillEditor
              v-model:content="localContent"
              contentType="html"
              theme="snow"
              :toolbar="toolbarOptions"
              :modules="editorModules"
              @ready="onEditorReady"
            />
          </ClientOnly>
        </div>

        <div class="preview-pane" ref="previewRoot">
          <div class="preview-header">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {{ $t('blog.preview') }}
            </h3>
          </div>
          <div class="preview-content prose dark:prose-invert max-w-none">
            <div v-if="renderedContent" v-html="sanitizedPreview" />
            <p v-else class="text-gray-400 italic">{{ $t('blog.previewPlaceholder') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div>
      <label for="excerpt" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ $t('blog.excerpt') }}
      </label>
      <div class="mt-1">
        <textarea
          id="excerpt"
          name="excerpt"
          rows="3"
          v-model="localExcerpt"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          :placeholder="$t('blog.excerptPlaceholder')"
        ></textarea>
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
          type="url"
          name="coverImage"
          id="coverImage"
          v-model="localCoverImage"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
          type="text"
          name="tags"
          id="tags"
          v-model="localTags"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import DOMPurify from 'dompurify'
import type { Config as DOMPurifyConfig } from 'dompurify'
import { QuillEditor } from '@vueup/vue-quill'
import { computed } from 'vue'
import { generateSlug } from '~/lib/blog'
import { CATEGORY_OPTIONS } from '~/types/blog'

const toast = useToast()

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

const editorRoot = ref<HTMLElement | null>(null)
const previewRoot = ref<HTMLElement | null>(null)
const editorScrollEl = ref<HTMLElement | null>(null)
const previewScrollEl = ref<HTMLElement | null>(null)
const syncScrollEnabled = ref(true)
const isSyncing = ref(false)
const quillInstance = ref<any>(null)

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

const toolbarOptions = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote', 'code-block'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],
  ['link', 'image', 'clean']
]

const handleImageUpload = () => {
  if (!quillInstance.value) return
  const input = document.createElement('input')
  input.setAttribute('type', 'file')
  input.setAttribute('accept', 'image/*')
  input.click()

  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    const sizeMb = file.size / BYTES_PER_MB
    if (sizeMb < MIN_IMAGE_SIZE_MB || sizeMb > MAX_IMAGE_SIZE_MB) {
      toast.error(`圖片大小需介於 ${MIN_IMAGE_SIZE_MB}MB ~ ${MAX_IMAGE_SIZE_MB}MB`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result) {
        toast.error('圖片上傳失敗')
        return
      }
      const range = quillInstance.value.getSelection(true)
      const insertAt = range?.index ?? quillInstance.value.getLength()
      quillInstance.value.insertEmbed(insertAt, 'image', result, 'user')
      quillInstance.value.setSelection(insertAt + 1, 0, 'silent')
    }
    reader.onerror = () => {
      toast.error('圖片上傳失敗')
    }
    reader.readAsDataURL(file)
  }
}

const editorModules = {
  toolbar: {
    container: toolbarOptions,
    handlers: {
      image: handleImageUpload
    }
  },
  clipboard: {
    matchVisual: false
  }
} as any

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

const slugPreview = computed(() => {
  return localTitle.value ? generateSlug(localTitle.value) : ''
})

const renderedContent = computed(() => localContent.value || '')
const sanitizedPreview = computed(() => {
  if (!renderedContent.value) return ''
  if (typeof DOMPurify?.sanitize !== 'function') {
    return renderedContent.value
  }
  return DOMPurify.sanitize(renderedContent.value, htmlSanitizeConfig)
})

const syncScroll = (source: HTMLElement, target: HTMLElement) => {
  const maxSource = source.scrollHeight - source.clientHeight
  const maxTarget = target.scrollHeight - target.clientHeight
  if (maxSource <= 0 || maxTarget <= 0) return
  const ratio = source.scrollTop / maxSource
  target.scrollTop = ratio * maxTarget
}

const handleEditorScroll = () => {
  if (!syncScrollEnabled.value || isSyncing.value) return
  if (!editorScrollEl.value || !previewScrollEl.value) return
  isSyncing.value = true
  syncScroll(editorScrollEl.value, previewScrollEl.value)
  requestAnimationFrame(() => {
    isSyncing.value = false
  })
}

const handlePreviewScroll = () => {
  if (!syncScrollEnabled.value || isSyncing.value) return
  if (!editorScrollEl.value || !previewScrollEl.value) return
  isSyncing.value = true
  syncScroll(previewScrollEl.value, editorScrollEl.value)
  requestAnimationFrame(() => {
    isSyncing.value = false
  })
}

const resolveScrollElements = () => {
  if (!editorRoot.value) return
  editorScrollEl.value = editorRoot.value.querySelector<HTMLElement>('.ql-container')
  previewScrollEl.value = previewRoot.value
}

const attachScrollListeners = () => {
  if (editorScrollEl.value) {
    editorScrollEl.value.addEventListener('scroll', handleEditorScroll)
  }
  if (previewScrollEl.value) {
    previewScrollEl.value.addEventListener('scroll', handlePreviewScroll)
  }
}

const detachScrollListeners = () => {
  if (editorScrollEl.value) {
    editorScrollEl.value.removeEventListener('scroll', handleEditorScroll)
  }
  if (previewScrollEl.value) {
    previewScrollEl.value.removeEventListener('scroll', handlePreviewScroll)
  }
}

const onEditorReady = (quill: any) => {
  quillInstance.value = quill
  nextTick(() => {
    resolveScrollElements()
    detachScrollListeners()
    attachScrollListeners()
  })
}

onBeforeUnmount(() => {
  detachScrollListeners()
})
</script>

<style scoped>
.editor-shell {
  box-shadow: 0 14px 30px rgb(15 23 42 / 8%);
}

.editor-layout {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.editor-pane :global(.ql-container) {
  min-height: 520px;
  border-radius: 0.75rem;
  background: #fff;
}

.editor-pane :global(.ql-toolbar) {
  border-radius: 0.75rem 0.75rem 0 0;
}

.preview-pane {
  display: flex;
  flex-direction: column;
  border-radius: 0.75rem;
  border: 1px solid rgb(229 231 235);
  background: rgb(249 250 251);
  max-height: 520px;
  overflow: auto;
}

:global(.dark .preview-pane) {
  border-color: rgb(55 65 81);
  background: rgb(17 24 39);
}

.preview-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgb(229 231 235);
  background: rgba(255, 255, 255, 0.8);
  position: sticky;
  top: 0;
  backdrop-filter: blur(6px);
  z-index: 10;
}

:global(.dark .preview-header) {
  border-color: rgb(55 65 81);
  background: rgba(17, 24, 39, 0.8);
}

.preview-content {
  padding: 1rem 1.25rem 2rem;
}

.editor-pane :global(.ql-toolbar),
.editor-pane :global(.ql-container) {
  border-color: rgb(229 231 235);
}

:global(.dark .editor-pane .ql-toolbar),
:global(.dark .editor-pane .ql-container) {
  border-color: rgb(55 65 81);
}

:global(.dark .editor-pane .ql-toolbar) {
  background: rgb(31 41 55);
}

:global(.dark .editor-pane .ql-container) {
  background: rgb(17 24 39);
}

:global(.dark .editor-pane .ql-editor) {
  color: rgb(229 231 235);
}

@media (max-width: 1024px) {
  .preview-pane {
    max-height: 420px;
  }
  .editor-pane :global(.ql-container) {
    min-height: 420px;
  }
}

@media (max-width: 900px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
  .preview-pane {
    max-height: none;
  }
}
</style>
