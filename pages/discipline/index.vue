<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '~/composables/useToast'
import { useI18n } from 'vue-i18n'
import DisciplineHeader from '~/components/discipline/DisciplineHeader.vue'
import DisciplineEmptyState from '~/components/discipline/DisciplineEmptyState.vue'
import DisciplineCard from '~/components/discipline/DisciplineCard.vue'
import DisciplineForm from '~/components/discipline/DisciplineForm.vue'
import DisciplineShareModal from '~/components/discipline/DisciplineShareModal.vue'
import DisciplineImportModal from '~/components/discipline/DisciplineImportModal.vue'
import { parseImportFromURL } from '~/lib/disciplineShare'

const { t } = useI18n()
const toast = useToast()

const list = ref<{ id: number; content: string; order: number; createdAt: string }[]>([])
const editingId = ref<number | null>(null)
const showShareModal = ref(false)
const showImportModal = ref(false)
const disciplineForm = ref<InstanceType<typeof DisciplineForm> | null>(null)

const fetchList = async () => {
  list.value = await $fetch<{ id: number; content: string; order: number; createdAt: string }[]>(
    '/api/discipline'
  )
}

const handleAdd = async (content: string) => {
  try {
    await $fetch('/api/discipline', {
      method: 'POST',
      body: { content },
    })
    disciplineForm.value?.reset()
    await fetchList()
    toast.success(t('discipline.toast.createSuccess'))
  } catch {
    toast.error(t('discipline.toast.createFailed'))
  }
}

const handleSaveEdit = async (id: number, content: string) => {
  try {
    await $fetch(`/api/discipline/${id}`, {
      method: 'PUT',
      body: { content },
    })
    editingId.value = null
    await fetchList()
    toast.success(t('discipline.toast.editSuccess'))
  } catch {
    toast.error(t('discipline.toast.editFailed'))
  }
}

const handleDelete = async (id: number) => {
  if (!confirm(t('discipline.toast.confirmDelete'))) return

  try {
    await $fetch(`/api/discipline/${id}`, {
      method: 'DELETE',
    })
    await fetchList()
    toast.success(t('discipline.toast.deleteSuccess'))
  } catch {
    toast.error(t('discipline.toast.deleteFailed'))
  }
}

// Reorder logic
let reorderTimer: ReturnType<typeof setTimeout> | null = null

const commitReorder = async () => {
  try {
    const orders = list.value.map((item) => ({
      id: item.id,
      order: item.order,
    }))

    const updatedList = await $fetch<{ id: number; content: string; order: number; createdAt: string }[]>('/api/discipline/reorder', {
      method: 'PATCH',
      body: { orders },
    })
    
    if (updatedList && Array.isArray(updatedList)) {
      list.value = updatedList
    }
  } catch {
    toast.error(t('discipline.toast.reorderFailed'))
    await fetchList()
  }
}

const scheduleReorderSave = () => {
  if (reorderTimer) clearTimeout(reorderTimer)
  reorderTimer = setTimeout(commitReorder, 300)
}

const moveUp = (index: number) => {
  if (index === 0) return
  const current = list.value[index]
  const prev = list.value[index - 1]
  if (!current || !prev) return
  const temp = current.order
  current.order = prev.order
  prev.order = temp
  // Swap positions in local array for immediate UI feedback
  list.value.splice(index - 1, 2, current, prev)
  scheduleReorderSave()
}

const moveDown = (index: number) => {
  if (index === list.value.length - 1) return
  const current = list.value[index]
  const next = list.value[index + 1]
  if (!current || !next) return
  const temp = current.order
  current.order = next.order
  next.order = temp
  // Swap positions in local array for immediate UI feedback
  list.value.splice(index, 2, next, current)
  scheduleReorderSave()
}

onMounted(async () => {
  await fetchList()
  if (parseImportFromURL()?.isValid) {
    showImportModal.value = true
  }
})

definePageMeta({
  middleware: 'auth'
})
</script>

<template>
  <div class="discipline-page">
    <div class="relative max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <DisciplineHeader />

      <DisciplineEmptyState v-if="list.length === 0" />

      <div v-else class="space-y-8">
        <!-- Section header with count -->
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-semibold" style="color: var(--color-text); font-family: var(--font-display);">{{ t('discipline.listSection.title') }}</h2>
          <div class="flex items-center px-4 py-2 rounded-lg border" style="background: var(--color-surface); border-color: var(--color-border);">
            <svg class="w-4 h-4 mr-2" style="color: var(--color-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span class="text-sm font-medium" style="color: var(--color-primary);">{{ t('discipline.listSection.count', { count: list.length }) }}</span>
          </div>
        </div>

        <!-- Premium discipline cards -->
        <div class="space-y-4">
          <TransitionGroup
            name="list"
            tag="div"
            class="space-y-4"
          >
            <DisciplineCard
              v-for="(item, index) in list"
              :key="item.id"
              :item="item"
              :index="index"
              :total="list.length"
              :is-editing="editingId === item.id"
              @start-edit="editingId = $event"
              @cancel-edit="editingId = null"
              @save-edit="handleSaveEdit"
              @delete="handleDelete"
              @move-up="moveUp"
              @move-down="moveDown"
            />
          </TransitionGroup>
        </div>
      </div>

      <DisciplineForm ref="disciplineForm" @submit="handleAdd" />

      <!-- Action buttons -->
      <div v-if="list.length > 0" class="flex justify-center gap-4 mb-12">
        <button
          @click="showShareModal = true"
          class="discipline-btn-primary inline-flex items-center px-6 py-3 text-white font-medium rounded-full shadow-sm hover:shadow-md transition-all duration-200"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
          </svg>
          {{ t('discipline.listSection.shareButton') }}
        </button>
        <button
          @click="showImportModal = true"
          class="discipline-btn-secondary inline-flex items-center px-6 py-3 text-white font-medium rounded-full shadow-sm hover:shadow-md transition-all duration-200"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
          </svg>
          {{ t('discipline.listSection.importButton') }}
        </button>
      </div>
    </div>

    <DisciplineShareModal
      :show="showShareModal"
      :list-length="list.length"
      @close="showShareModal = false"
    />

    <DisciplineImportModal
      :show="showImportModal"
      @close="showImportModal = false"
      @imported="fetchList"
    />
  </div>
</template>

<style scoped>
.discipline-page {
  background: var(--color-background);
}
.discipline-btn-primary {
  background: var(--color-primary);
}
.discipline-btn-primary:hover {
  filter: brightness(1.15);
}
.discipline-btn-secondary {
  background: var(--color-secondary);
}
.discipline-btn-secondary:hover {
  filter: brightness(1.15);
}
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
.list-move {
  transition: transform 0.5s ease;
}
</style>
