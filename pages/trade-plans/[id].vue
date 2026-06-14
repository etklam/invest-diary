<template>
  <div class="mx-auto max-w-[920px] space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">{{ $t('tradePlan.kicker') }}</p>
        <h1 class="font-display mt-1 text-3xl tracking-tight text-dt-text">
          {{ tradePlan?.symbol || $t('tradePlan.title') }}
        </h1>
      </div>
      <div class="flex flex-wrap gap-2">
        <NuxtLink to="/trade-plans">
          <BaseButton variant="secondary">{{ $t('tradePlan.actions.backToList') }}</BaseButton>
        </NuxtLink>
        <BaseButton v-if="tradePlan" variant="danger" :disabled="deleting" @click="deleteTradePlan">
          {{ $t('common.delete') }}
        </BaseButton>
      </div>
    </header>

    <section v-if="pending" class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-md">
      <AppSkeleton variant="card" :count="3" />
    </section>

    <section v-else-if="error" class="rounded-dt-md border border-dt-danger/30 bg-dt-surface p-5 text-dt-danger shadow-dt-md">
      {{ $t('tradePlan.loadFailed') }}
    </section>

    <TradePlanForm
      v-else-if="tradePlan"
      :initial="initialForm"
      :diaries="diaryOptions"
      :saving="saving"
      :submit-label="$t('tradePlan.actions.save')"
      @submit="updateTradePlan"
    />
  </div>
</template>

<script setup lang="ts">
import type { TradePlan, TradePlanFormValue } from '~/types/trade-plan'
import { isAuthSessionError } from '~/lib/auth/session-error'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const { runWithAuthRecovery } = useAuthRecovery()
const saving = ref(false)
const deleting = ref(false)
const tradePlanId = computed(() => String(route.params.id || ''))

const { data: tradePlan, pending, error, refresh } = await useLazyFetch<TradePlan>(() => `/api/trade-plans/${tradePlanId.value}`)
const { data: diariesResponse } = await useLazyFetch<any>('/api/diaries', {
  query: { limit: '100' },
  default: () => ({ data: [] }),
})

const diaryOptions = computed(() => diariesResponse.value?.data ?? [])

const formString = (value?: string | number | null) => value === null || value === undefined ? '' : String(value)

const initialForm = computed<Partial<TradePlanFormValue>>(() => ({
  diaryId: tradePlan.value?.diaryId ? String(tradePlan.value.diaryId) : '',
  symbol: tradePlan.value?.symbol ?? '',
  setupType: tradePlan.value?.setupType ?? '',
  entryPrice: formString(tradePlan.value?.entryPrice),
  entryZoneLow: formString(tradePlan.value?.entryZoneLow),
  entryZoneHigh: formString(tradePlan.value?.entryZoneHigh),
  stopLoss: formString(tradePlan.value?.stopLoss),
  targetPrice: formString(tradePlan.value?.targetPrice),
  maxPositionSize: formString(tradePlan.value?.maxPositionSize),
  invalidationCondition: tradePlan.value?.invalidationCondition ?? '',
  notes: tradePlan.value?.notes ?? '',
  status: tradePlan.value?.status ?? 'draft',
}))

const toPayload = (value: TradePlanFormValue) => Object.fromEntries(
  Object.entries(value).map(([key, fieldValue]) => [
    key,
    typeof fieldValue === 'string' && fieldValue.trim() === '' ? null : fieldValue,
  ]),
)

const updateTradePlan = async (value: TradePlanFormValue) => {
  if (saving.value) return
  saving.value = true
  try {
    await runWithAuthRecovery(() => $fetch(`/api/trade-plans/${tradePlanId.value}`, {
      method: 'PUT',
      body: toPayload(value),
    }))
    toast.success(t('tradePlan.messages.saved'))
    await refresh()
  } catch (err) {
    if (isAuthSessionError(err)) return
    toast.error(t('tradePlan.messages.saveFailed'))
  } finally {
    saving.value = false
  }
}

const deleteTradePlan = async () => {
  if (deleting.value || !confirm(t('tradePlan.messages.deleteConfirm'))) return
  deleting.value = true
  try {
    await runWithAuthRecovery(() => $fetch(`/api/trade-plans/${tradePlanId.value}`, { method: 'DELETE' }))
    toast.success(t('tradePlan.messages.deleted'))
    await router.push('/trade-plans')
  } catch (err) {
    if (isAuthSessionError(err)) return
    toast.error(t('tradePlan.messages.deleteFailed'))
  } finally {
    deleting.value = false
  }
}
</script>
