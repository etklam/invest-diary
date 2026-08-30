<template>
  <form class="space-y-6" @submit.prevent="submit">
    <LedgerCard :title="$t('tradePlan.form.sections.core')">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="grid gap-1 text-sm">
          <span class="font-semibold text-dt-text">{{ $t('tradePlan.fields.symbol') }}</span>
          <input
            v-model="form.symbol"
            required
            maxlength="32"
            class="rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-2 text-dt-text focus:border-dt-primary focus:outline-none"
            placeholder="AAPL"
          />
        </label>

        <label class="grid gap-1 text-sm">
          <span class="font-semibold text-dt-text">{{ $t('tradePlan.fields.status') }}</span>
          <select
            v-model="form.status"
            class="rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-2 text-dt-text focus:border-dt-primary focus:outline-none"
          >
            <option v-for="status in statusOptions" :key="status" :value="status">
              {{ $t(`tradePlan.status.${status}`) }}
            </option>
          </select>
        </label>

        <label class="grid gap-1 text-sm md:col-span-2">
          <span class="font-semibold text-dt-text">{{ $t('tradePlan.fields.setupType') }}</span>
          <input
            v-model="form.setupType"
            maxlength="100"
            class="rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-2 text-dt-text focus:border-dt-primary focus:outline-none"
            :placeholder="$t('tradePlan.placeholders.setupType')"
          />
        </label>
      </div>
    </LedgerCard>

    <LedgerCard :title="$t('tradePlan.form.sections.levels')">
      <div class="grid gap-4 md:grid-cols-3">
        <NumberField v-model="form.entryPrice" :label="$t('tradePlan.fields.entryPrice')" />
        <NumberField v-model="form.entryZoneLow" :label="$t('tradePlan.fields.entryZoneLow')" />
        <NumberField v-model="form.entryZoneHigh" :label="$t('tradePlan.fields.entryZoneHigh')" />
        <NumberField v-model="form.stopLoss" :label="$t('tradePlan.fields.stopLoss')" />
        <NumberField v-model="form.targetPrice" :label="$t('tradePlan.fields.targetPrice')" />
        <NumberField v-model="form.maxPositionSize" :label="$t('tradePlan.fields.maxPositionSize')" step="0.01" />
      </div>
    </LedgerCard>

    <LedgerCard :title="$t('tradePlan.form.sections.context')">
      <div class="grid gap-4">
        <label class="grid gap-1 text-sm">
          <span class="font-semibold text-dt-text">{{ $t('tradePlan.fields.linkedDiary') }}</span>
          <select
            v-model="form.diaryId"
            class="rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-2 text-dt-text focus:border-dt-primary focus:outline-none"
          >
            <option value="">{{ $t('tradePlan.form.noLinkedDiary') }}</option>
            <option v-for="diary in diaries" :key="String(diary.id)" :value="String(diary.id)">
              {{ diary.title }} · {{ formatDate(diary.date) }}
            </option>
          </select>
        </label>

        <label class="grid gap-1 text-sm">
          <span class="font-semibold text-dt-text">{{ $t('tradePlan.fields.invalidationCondition') }}</span>
          <textarea
            v-model="form.invalidationCondition"
            rows="3"
            class="rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-2 text-dt-text focus:border-dt-primary focus:outline-none"
            :placeholder="$t('tradePlan.placeholders.invalidationCondition')"
          />
        </label>

        <label class="grid gap-1 text-sm">
          <span class="font-semibold text-dt-text">{{ $t('tradePlan.fields.notes') }}</span>
          <textarea
            v-model="form.notes"
            rows="5"
            class="rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-2 text-dt-text focus:border-dt-primary focus:outline-none"
            :placeholder="$t('tradePlan.placeholders.notes')"
          />
        </label>
      </div>
    </LedgerCard>

    <div class="flex flex-wrap justify-end gap-3">
      <BaseButton to="/trade-plans" variant="secondary">{{ $t('common.cancel') }}</BaseButton>
      <BaseButton type="submit" :disabled="saving">
        <Icon v-if="saving" name="svg-spinners:180-ring-with-bg" class="h-4 w-4" />
        {{ submitLabel }}
      </BaseButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { TRADE_PLAN_STATUSES, type TradePlanFormValue } from '~/types/trade-plan'
import type { DiaryResponse } from '~/types/diary'

const props = withDefaults(defineProps<{
  initial?: Partial<TradePlanFormValue>
  diaries?: DiaryResponse[]
  saving?: boolean
  submitLabel: string
}>(), {
  initial: () => ({}),
  diaries: () => [],
  saving: false,
})

const emit = defineEmits<{
  submit: [value: TradePlanFormValue]
}>()

const statusOptions = TRADE_PLAN_STATUSES
const { formatLocaleDate } = useTimezone()

const buildForm = (initial: Partial<TradePlanFormValue>): TradePlanFormValue => ({
  diaryId: initial.diaryId ?? '',
  symbol: initial.symbol ?? '',
  setupType: initial.setupType ?? '',
  entryPrice: initial.entryPrice ?? '',
  entryZoneLow: initial.entryZoneLow ?? '',
  entryZoneHigh: initial.entryZoneHigh ?? '',
  stopLoss: initial.stopLoss ?? '',
  targetPrice: initial.targetPrice ?? '',
  maxPositionSize: initial.maxPositionSize ?? '',
  invalidationCondition: initial.invalidationCondition ?? '',
  notes: initial.notes ?? '',
  status: initial.status ?? 'draft',
})

const form = reactive<TradePlanFormValue>(buildForm(props.initial))

watch(() => props.initial, (value) => {
  Object.assign(form, buildForm(value))
}, { deep: true })

const formatDate = (value: string) => {
  return formatLocaleDate(value, { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const submit = () => {
  emit('submit', { ...form })
}
</script>
