import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export interface QuickNoteTemplate {
  id: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
  isDefault?: boolean
}

const TEMPLATE_KEY = 'quick-note-templates'

const DEFAULT_TEMPLATES: QuickNoteTemplate[] = [
  {
    id: 'default-1',
    name: '今日心情',
    content: '今日心情：\n\n原因：\n\n想做的事：',
    createdAt: '',
    updatedAt: '',
    isDefault: true
  },
  {
    id: 'default-2',
    name: '三件小事',
    content: '1. \n2. \n3. ',
    createdAt: '',
    updatedAt: '',
    isDefault: true
  },
  {
    id: 'default-3',
    name: '學習紀錄',
    content: '今天學到：\n\n還有疑問：\n\n下一步：',
    createdAt: '',
    updatedAt: '',
    isDefault: true
  },
  {
    id: 'default-4',
    name: '交易回顧',
    content: '標的：\n\n策略：\n\n結果與反思：',
    createdAt: '',
    updatedAt: '',
    isDefault: true
  },
  {
    id: 'default-5',
    name: '靈感紀錄',
    content: '靈感一句話：\n\n展開：\n\n下一步：',
    createdAt: '',
    updatedAt: '',
    isDefault: true
  },
  {
    id: 'default-6',
    name: '待辦清單',
    content: '- \n- \n- ',
    createdAt: '',
    updatedAt: '',
    isDefault: true
  }
]

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `tmpl-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useQuickNoteTemplates() {
  const customTemplates = useLocalStorage<QuickNoteTemplate[]>(TEMPLATE_KEY, [])

  const templates = computed(() => {
    return [...DEFAULT_TEMPLATES, ...customTemplates.value]
  })

  const addTemplate = (name: string, content: string) => {
    const now = new Date().toISOString()
    customTemplates.value = [
      {
        id: createId(),
        name: name.trim(),
        content,
        createdAt: now,
        updatedAt: now
      },
      ...customTemplates.value
    ]
  }

  const updateTemplate = (id: string, updates: Pick<QuickNoteTemplate, 'name' | 'content'>) => {
    const now = new Date().toISOString()
    customTemplates.value = customTemplates.value.map(t => {
      if (t.id !== id) return t
      return {
        ...t,
        ...updates,
        updatedAt: now
      }
    })
  }

  const removeTemplate = (id: string) => {
    customTemplates.value = customTemplates.value.filter(t => t.id !== id)
  }

  return {
    templates,
    customTemplates,
    addTemplate,
    updateTemplate,
    removeTemplate
  }
}
