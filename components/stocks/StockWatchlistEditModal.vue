<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="close" />

        <!-- Modal Content -->
        <div
          ref="dialogPanel"
          class="relative bg-dt-surface rounded-dt-md shadow-dt-lg w-full max-w-md overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-watchlist-edit-title"
          tabindex="-1"
          @keydown="handleKeydown"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-dt-border">
            <h2 id="stock-watchlist-edit-title" class="text-lg font-semibold text-dt-text">
              {{ t('stock.watchlist.editModal.title') }}
            </h2>
            <button
              class="flex min-h-11 min-w-11 items-center justify-center rounded-dt-sm text-dt-text-soft hover:text-dt-text transition-colors"
              :aria-label="t('common.close')"
              @click="close"
            >
              <Icon name="heroicons:x-mark" class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-5 space-y-5">
            <!-- Symbol Display -->
            <div class="flex items-center gap-3 p-3 bg-dt-surface-strong/60 rounded-lg">
              <div class="w-10 h-10 flex items-center justify-center bg-dt-info/10 rounded-lg">
                <Icon name="heroicons:chart-bar" class="w-5 h-5 text-dt-info" />
              </div>
              <div>
                <p class="text-sm font-semibold text-dt-text">{{ item?.stock.symbol }}</p>
                <p v-if="item?.stock.name" class="text-xs text-dt-text-soft">{{ item.stock.name }}</p>
              </div>
            </div>

            <!-- Status Toggle -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-dt-text">
                {{ t('stock.watchlist.editModal.status') }}
              </label>
              <div class="flex gap-2">
                <button
                  v-for="statusOption in statusOptions"
                  :key="statusOption.value"
                  type="button"
                  class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                  :class="form.status === statusOption.value
                    ? 'bg-dt-primary-solid text-white shadow-sm'
                    : 'bg-dt-surface-strong text-dt-text hover:bg-dt-surface-strong'"
                  @click="form.status = statusOption.value"
                >
                  {{ statusOption.label }}
                </button>
              </div>
            </div>

            <!-- Sort Order -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-dt-text">
                {{ t('stock.watchlist.editModal.sortOrder') }}
              </label>
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="flex min-h-11 min-w-11 items-center justify-center bg-dt-surface-strong rounded-lg hover:bg-dt-surface-strong transition-colors"
                  :disabled="form.sortOrder >= 10000"
                  :aria-label="t('common.increment')"
                  @click="form.sortOrder = Math.min(10000, form.sortOrder + 10)"
                >
                  <Icon name="heroicons:plus" class="w-4 h-4 text-dt-text-muted" />
                </button>
                <input
                  v-model.number="form.sortOrder"
                  type="number"
                  min="0"
                  max="10000"
                  class="flex-1 px-4 py-2.5 bg-dt-surface-strong/60 border border-dt-border rounded-lg text-center text-dt-text focus:ring-2 focus:ring-dt-primary/30 focus:border-transparent"
                >
                <button
                  type="button"
                  class="flex min-h-11 min-w-11 items-center justify-center bg-dt-surface-strong rounded-lg hover:bg-dt-surface-strong transition-colors"
                  :disabled="form.sortOrder <= 0"
                  :aria-label="t('common.decrement')"
                  @click="form.sortOrder = Math.max(0, form.sortOrder - 10)"
                >
                  <Icon name="heroicons:minus" class="w-4 h-4 text-dt-text-muted" />
                </button>
              </div>
              <p class="text-xs text-dt-text-soft">
                {{ t('stock.watchlist.editModal.sortOrderHint') }}
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex gap-3 px-6 py-4 bg-dt-surface-strong/60 border-t border-dt-border">
            <button
              type="button"
              class="flex-1 px-4 py-2.5 text-sm font-medium text-dt-text hover:bg-dt-surface-strong rounded-lg transition-colors"
              @click="close"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-dt-primary-solid hover:bg-dt-primary-solid-active rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="saving || !hasChanges"
              @click="save"
            >
              <Icon v-if="saving" name="svg-spinners:180-ring-with-bg" class="w-4 h-4 mr-1.5" />
              {{ saving ? t('common.saving') : t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDialogA11y } from '~/composables/useDialogA11y'

interface WatchlistItem {
  id: string
  stock: { symbol: string; name?: string | null }
  status?: string
  sortOrder?: number
}

const props = defineProps<{
  isOpen: boolean
  item: WatchlistItem | null
}>()

const emit = defineEmits<{
  close: []
  save: [id: string, data: { status?: string; sortOrder?: number }]
}>()

const { t } = useI18n()
const toast = useToast()

const saving = ref(false)
const dialogPanel = ref<HTMLElement | null>(null)

const form = reactive({
  status: 'WATCHING' as 'WATCHING' | 'ARCHIVED',
  sortOrder: 0
})

type StatusOption = { value: 'WATCHING' | 'ARCHIVED'; label: string }

const statusOptions = computed((): StatusOption[] => [
  { value: 'WATCHING', label: t('stock.watchlist.editModal.statusWatching') },
  { value: 'ARCHIVED', label: t('stock.watchlist.editModal.statusArchived') }
])

const hasChanges = computed(() => {
  if (!props.item) return false
  return (
    form.status !== (props.item.status || 'WATCHING') ||
    form.sortOrder !== (props.item.sortOrder || 0)
  )
})

// Initialize form when item changes
watch(() => props.item, (newItem) => {
  if (newItem) {
    form.status = (newItem.status as 'WATCHING' | 'ARCHIVED') || 'WATCHING'
    form.sortOrder = newItem.sortOrder || 0
  }
}, { immediate: true })

const close = () => {
  emit('close')
}

const save = async () => {
  if (!props.item || saving.value) return

  saving.value = true
  try {
    emit('save', props.item.id, {
      status: form.status,
      sortOrder: form.sortOrder
    })
    // Parent component will handle the API call and close the modal
  } catch {
    toast.error(t('stock.watchlist.editModal.saveFailed'))
  } finally {
    saving.value = false
  }
}

const { handleKeydown } = useDialogA11y(dialogPanel, {
  open: () => props.isOpen,
  onEscape: close,
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>
