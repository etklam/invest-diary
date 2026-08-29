<template>
  <div class="space-y-4">
    <div v-if="transactions.length === 0" class="rounded-dt-sm border border-dashed border-dt-border bg-dt-surface-strong py-8 text-center">
      <p class="text-sm text-dt-text-muted">{{ t('diary.form.noTransactions') }}</p>
      <BaseButton variant="secondary" class="mt-3" @click="addTransaction">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        {{ t('diary.form.addTransaction') }}
      </BaseButton>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="(transaction, index) in transactions"
        :key="uidOf(transaction)"
        class="relative rounded-dt-sm border bg-dt-surface-strong p-4"
        :class="hasValidationError(transaction) ? 'border-dt-danger' : 'border-dt-border'"
      >
        <button
          type="button"
          @click="removeTransaction(index)"
          class="absolute right-1 top-1 flex min-h-[44px] min-w-[44px] items-center justify-center text-dt-text-soft transition-colors hover:text-dt-danger"
          :aria-label="t('diary.form.removeTransaction')"
        >
          <Icon name="heroicons:x-mark" class="h-5 w-5" />
        </button>

        <div class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-6">
          <div class="sm:col-span-1">
            <label :for="`symbol-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.symbol') }}</label>
            <input
              type="text"
              :id="`symbol-${index}`"
              :value="transaction.symbol"
              @input="updateSymbol(index, $event)"
              :aria-invalid="hasFieldValidationError(transaction, 'symbol')"
              :aria-describedby="hasFieldValidationError(transaction, 'symbol') ? `txn-error-${uidOf(transaction)}` : undefined"
              :class="[inputClass, hasFieldValidationError(transaction, 'symbol') ? 'border-dt-danger focus:border-dt-danger' : '']"
              class="uppercase"
              placeholder="AAPL"
            />
          </div>

          <div class="sm:col-span-1">
            <label :for="`type-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.type') }}</label>
            <select
              :id="`type-${index}`"
              v-model="transaction.type"
              @change="validateTransaction(index)"
              :class="inputClass"
            >
              <option value="BUY">{{ t('diary.form.buy') }}</option>
              <option value="SELL">{{ t('diary.form.sell') }}</option>
            </select>
          </div>

          <div class="sm:col-span-1">
            <label :for="`quantity-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
              {{ t('diary.form.quantity') }}
            </label>
            <input
              type="number"
              :id="`quantity-${index}`"
              v-model.number="transaction.quantity"
              @input="validateTransaction(index)"
              step="0.0001"
              min="0.0001"
              :aria-invalid="hasFieldValidationError(transaction, 'quantity')"
              :aria-describedby="hasFieldValidationError(transaction, 'quantity') ? `txn-error-${uidOf(transaction)}` : undefined"
              :class="[inputClass, hasFieldValidationError(transaction, 'quantity') ? 'border-dt-danger focus:border-dt-danger' : '']"
              class="font-mono"
            />
          </div>

          <div class="sm:col-span-1">
            <label :for="`price-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.price') }}</label>
            <input
              type="number"
              :id="`price-${index}`"
              v-model.number="transaction.price"
              @input="validateTransaction(index)"
              step="0.01"
              min="0.0001"
              :aria-invalid="hasFieldValidationError(transaction, 'price')"
              :aria-describedby="hasFieldValidationError(transaction, 'price') ? `txn-error-${uidOf(transaction)}` : undefined"
              :class="[inputClass, hasFieldValidationError(transaction, 'price') ? 'border-dt-danger focus:border-dt-danger' : '']"
              class="font-mono"
            />
          </div>

          <div class="sm:col-span-2">
            <label :for="`date-${index}`" class="block text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('diary.form.dateTime') }}</label>
            <input
              type="datetime-local"
              :id="`date-${index}`"
              v-model="transaction.trade_date"
              :class="inputClass"
              class="font-mono"
            />
          </div>
        </div>

        <!-- Validation Error Message -->
        <div v-if="getValidationError(transaction)" :id="`txn-error-${uidOf(transaction)}`" role="alert" class="mt-3 flex items-center text-sm text-dt-danger">
          <Icon name="heroicons:exclamation-triangle" class="mr-1 h-4 w-4" />
          {{ getValidationError(transaction) }}
        </div>

        <!-- 交易筆記（柔性提示，可摺疊） -->
        <div class="mt-3 border-t border-dt-border pt-3">
          <button
            type="button"
            @click="toggleNotes(transaction)"
            class="flex items-center text-xs text-dt-text-muted transition-colors hover:text-dt-primary"
          >
            <Icon
              :name="expandedNotes.has(uidOf(transaction)) ? 'heroicons:chevron-down' : 'heroicons:chevron-right'"
              class="mr-1 h-3 w-3"
            />
            {{ expandedNotes.has(uidOf(transaction)) ? t('diary.form.notesToggleOpen') : t('diary.form.notesToggle') }}
          </button>

          <div v-if="expandedNotes.has(uidOf(transaction))" class="mt-3 space-y-3">
            <!-- notes -->
            <div>
              <label :for="`notes-${index}`" class="block text-xs font-medium text-dt-text-muted">
                {{ t('diary.form.notes') }}
              </label>
              <textarea
                :id="`notes-${index}`"
                :value="transaction.notes ?? ''"
                @input="updateField(index, 'notes', ($event.target as HTMLTextAreaElement).value)"
                rows="2"
                class="mt-1 block w-full resize-none rounded-dt-sm border border-dt-border bg-dt-surface px-3 py-2 text-sm text-dt-text focus:border-dt-primary focus:outline-none"
                :placeholder="t('diary.form.notesPlaceholder')"
              />
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <!-- strategy -->
              <div>
                <label :for="`strategy-${index}`" class="block text-xs font-medium text-dt-text-muted">
                  {{ t('diary.form.strategy') }}
                </label>
                <input
                  type="text"
                  :id="`strategy-${index}`"
                  :value="transaction.strategy ?? ''"
                  @input="updateField(index, 'strategy', ($event.target as HTMLInputElement).value)"
                  :class="inputClass"
                  :placeholder="t('diary.form.strategyPlaceholder')"
                />
              </div>

              <!-- emotion -->
              <div>
                <label :for="`emotion-${index}`" class="block text-xs font-medium text-dt-text-muted">
                  {{ t('diary.form.emotion') }}
                </label>
                <select
                  :id="`emotion-${index}`"
                  :value="transaction.emotion ?? ''"
                  @change="updateField(index, 'emotion', ($event.target as HTMLSelectElement).value)"
                  :class="inputClass"
                >
                  <option value="">{{ t('diary.form.emotionSelect') }}</option>
                  <option value="calm">{{ t('diary.form.emotionCalm') }}</option>
                  <option value="confident">{{ t('diary.form.emotionConfident') }}</option>
                  <option value="uncertain">{{ t('diary.form.emotionUncertain') }}</option>
                  <option value="fomo">{{ t('diary.form.emotionFomo') }}</option>
                  <option value="fear">{{ t('diary.form.emotionFear') }}</option>
                  <option value="greed">{{ t('diary.form.emotionGreed') }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div class="flex justify-end">
        <BaseButton variant="secondary" @click="addTransaction">
          <Icon name="heroicons:plus" class="h-4 w-4" />
          {{ t('diary.form.addTransaction') }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { validateTransactionValues } from '~/lib/diary-authoring/validation'
import type { DiaryAuthoringTransaction } from '~/lib/diary-authoring/types'

type Transaction = DiaryAuthoringTransaction
type ValidationField = 'symbol' | 'quantity' | 'price'

const props = defineProps<{
  modelValue: Transaction[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Transaction[]): void
}>()

const { t } = useI18n()

const inputClass = 'mt-1 block w-full min-h-[44px] rounded-dt-sm border border-dt-border bg-dt-surface px-3 text-sm text-dt-text focus:border-dt-primary focus:outline-none'

const transactions = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Rows are keyed by a stable client-side uid (object identity), never index —
// removing a row must not shift errors or expanded notes onto another row.
let uidSeq = 0
const rowUids = new WeakMap<Transaction, string>()
const uidOf = (tx: Transaction): string => {
  let uid = rowUids.get(tx)
  if (!uid) {
    uid = `tx-${++uidSeq}`
    rowUids.set(tx, uid)
  }
  return uid
}

// Validation errors map（key: row uid）
const validationErrors = ref<Map<string, string>>(new Map())
const validationFields = ref<Map<string, ValidationField>>(new Map())

// 展開交易筆記的 row uid 集合
const expandedNotes = ref<Set<string>>(new Set())

const toggleNotes = (tx: Transaction) => {
  const uid = uidOf(tx)
  if (expandedNotes.value.has(uid)) {
    expandedNotes.value.delete(uid)
  } else {
    expandedNotes.value.add(uid)
  }
  // trigger reactivity
  expandedNotes.value = new Set(expandedNotes.value)
}

// 更新指定欄位（通用，用於 notes/strategy/emotion）
const updateField = (index: number, field: 'notes' | 'strategy' | 'emotion', value: string) => {
  const tx = transactions.value[index]
  if (!tx) return
  ;(tx as any)[field] = value || undefined
}

// Validate a single transaction
const validateTransaction = (index: number) => {
  const tx = transactions.value[index]
  if (!tx) return

  const errors: string[] = []
  let errorField: ValidationField | undefined

  const valueError = validateTransactionValues([tx], { requirePrice: true })
  if (valueError) {
    errors.push(t('diary.form.positiveNumber'))
    errorField = valueError.field
  }

  // Validate SELL transactions
  if (errors.length === 0 && tx.type === 'SELL') {
    const symbol = tx.symbol?.trim()

    if (!symbol) {
      errors.push(t('diary.form.sellNeedsSymbol'))
      errorField = 'symbol'
    }
  }

  if (errors.length > 0) {
    const firstError = errors[0]
    if (firstError) {
      validationErrors.value.set(uidOf(tx), firstError)
      if (errorField) validationFields.value.set(uidOf(tx), errorField)
    }
  } else {
    validationErrors.value.delete(uidOf(tx))
    validationFields.value.delete(uidOf(tx))
  }
}

// Check if transaction has validation error
const hasValidationError = (tx: Transaction): boolean => {
  return validationErrors.value.has(uidOf(tx))
}

// Get validation error message
const getValidationError = (tx: Transaction): string | undefined => {
  return validationErrors.value.get(uidOf(tx))
}

const hasFieldValidationError = (tx: Transaction, field: ValidationField): boolean => {
  return validationFields.value.get(uidOf(tx)) === field
}

const addTransaction = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())

  transactions.value.push({
    symbol: '',
    type: 'BUY',
    quantity: 0,
    price: 0,
    trade_date: now.toISOString().slice(0, 16),
  })
}

const removeTransaction = (index: number) => {
  const removed = transactions.value[index]
  transactions.value.splice(index, 1)
  if (!removed) return
  // Clear validation error and expanded notes keyed to the removed row
  validationErrors.value.delete(uidOf(removed))
  validationFields.value.delete(uidOf(removed))
  expandedNotes.value.delete(uidOf(removed))
  expandedNotes.value = new Set(expandedNotes.value)
  // Revalidate ALL remaining transactions (holdings may have shifted)
  transactions.value.forEach((_, idx) => {
    validateTransaction(idx)
  })
}

// Keep inline validation in sync with externally replaced rows without
// traversing unrelated note fields on every render.
watch(
  () => transactions.value.map((tx) => ({
    symbol: tx.symbol,
    type: tx.type,
    quantity: tx.quantity,
    price: tx.price,
  })),
  () => {
    transactions.value.forEach((_, index) => validateTransaction(index))
  },
)

// Update symbol and convert to uppercase and trim
const updateSymbol = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value.trim().toUpperCase()
  const tx = transactions.value[index]
  if (!tx) return
  tx.symbol = value
  validateTransaction(index)
}
</script>
