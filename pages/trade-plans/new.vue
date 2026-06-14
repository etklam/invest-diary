<template>
  <div class="mx-auto max-w-[920px] space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">{{ $t('tradePlan.kicker') }}</p>
        <h1 class="font-display mt-1 text-3xl tracking-tight text-dt-text">{{ $t('tradePlan.actions.new') }}</h1>
      </div>
      <NuxtLink to="/trade-plans">
        <BaseButton variant="secondary">{{ $t('tradePlan.actions.backToList') }}</BaseButton>
      </NuxtLink>
    </header>

    <TradePlanForm
      :initial="initialForm"
      :diaries="diaryOptions"
      :saving="saving"
      :submit-label="$t('tradePlan.actions.create')"
      @submit="createTradePlan"
    />
  </div>
</template>

<script setup lang="ts">
import type { TradePlanFormValue } from '~/types/trade-plan'
import { isAuthSessionError } from '~/lib/auth/session-error'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const { runWithAuthRecovery } = useAuthRecovery()
const saving = ref(false)
const statePrefill = ref<Partial<TradePlanFormValue>>({})

const { data: diariesResponse } = await useLazyFetch<any>('/api/diaries', {
  query: { limit: '100' },
  default: () => ({ data: [] }),
})

const diaryOptions = computed(() => diariesResponse.value?.data ?? [])

const queryValue = (name: string) => {
  const value = route.query[name]
  return Array.isArray(value) ? value[0] || '' : String(value || '')
}

onMounted(() => {
  if (route.query.prefill !== 'position-sizing') return

  const raw = sessionStorage.getItem('tradePlanPrefill')
  if (!raw) return

  try {
    statePrefill.value = JSON.parse(raw) as Partial<TradePlanFormValue>
    sessionStorage.removeItem('tradePlanPrefill')
  } catch {
    statePrefill.value = {}
  }
})

const initialForm = computed<Partial<TradePlanFormValue>>(() => ({
  symbol: statePrefill.value.symbol ?? queryValue('symbol'),
  entryPrice: statePrefill.value.entryPrice ?? queryValue('entryPrice'),
  maxPositionSize: statePrefill.value.maxPositionSize ?? queryValue('maxPositionSize'),
  notes: statePrefill.value.notes ?? queryValue('notes'),
  status: statePrefill.value.status ?? 'draft',
}))

const toPayload = (value: TradePlanFormValue) => Object.fromEntries(
  Object.entries(value).map(([key, fieldValue]) => [
    key,
    typeof fieldValue === 'string' && fieldValue.trim() === '' ? null : fieldValue,
  ]),
)

const createTradePlan = async (value: TradePlanFormValue) => {
  if (saving.value) return
  saving.value = true
  try {
    const created = await runWithAuthRecovery(() => $fetch<any>('/api/trade-plans', {
      method: 'POST',
      body: toPayload(value),
    }))
    toast.success(t('tradePlan.messages.created'))
    await router.push(`/trade-plans/${created.id}`)
  } catch (err) {
    if (isAuthSessionError(err)) return
    toast.error(t('tradePlan.messages.createFailed'))
  } finally {
    saving.value = false
  }
}
</script>
