<template>
  <div class="mx-auto max-w-[920px] space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">{{ $t('tradePlan.kicker') }}</p>
        <h1 class="font-display mt-1 text-3xl tracking-tight text-dt-text">{{ $t('tradePlan.actions.new') }}</h1>
      </div>
      <BaseButton to="/trade-plans" variant="secondary">{{ $t('tradePlan.actions.backToList') }}</BaseButton>
    </header>

    <section v-if="resolvingDiaryContext" class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-sm">
      <AppSkeleton variant="card" :count="3" />
    </section>

    <TradePlanForm
      v-else
      :initial="initialForm"
      :diaries="diaryOptions"
      :saving="saving"
      :submit-label="$t('tradePlan.actions.create')"
      @submit="createTradePlan"
    />
  </div>
</template>

<script setup lang="ts">
import type { DiariesApiResponse, DiaryResponse } from '~/types/diary'
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

const { data: diariesResponse } = await useLazyFetch<DiariesApiResponse>('/api/diaries', {
  query: { limit: '100' },
  default: () => ({ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } }),
})

const queryValue = (name: string) => {
  const value = route.query[name]
  return Array.isArray(value) ? value[0] || '' : String(value || '')
}

const contextDiary = ref<DiaryResponse | null>(null)
const routePrefill = ref<Pick<TradePlanFormValue, 'diaryId' | 'symbol'> | null>(null)
const resolvingDiaryContext = ref(Boolean(queryValue('diaryId')))
const diaryOptions = computed<DiaryResponse[]>(() => {
  const options = diariesResponse.value?.data ?? []
  if (!contextDiary.value || options.some(diary => String(diary.id) === String(contextDiary.value!.id))) return options
  return [contextDiary.value, ...options]
})

const routeDiary = computed(() => diaryOptions.value.find(
  diary => String(diary.id) === queryValue('diaryId'),
))

const uniqueStructuredSymbol = (diary: DiaryResponse) => {
  const symbols = new Set<string>((diary?.transactions ?? [])
    .map(transaction => typeof transaction.symbol === 'string' ? transaction.symbol.trim() : '')
    .filter(Boolean))
  return symbols.size === 1 ? ([...symbols][0] ?? '') : ''
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

onMounted(async () => {
  const diaryId = queryValue('diaryId')
  if (!diaryId) return

  try {
    const ownedDiary = (routeDiary.value ?? await $fetch(`/api/diaries/${encodeURIComponent(diaryId)}`)) as DiaryResponse
    contextDiary.value = ownedDiary
    routePrefill.value = {
      diaryId: String(ownedDiary.id),
      symbol: uniqueStructuredSymbol(ownedDiary),
    }
  } catch {
    contextDiary.value = null
    routePrefill.value = null
  } finally {
    resolvingDiaryContext.value = false
  }
})

const initialForm = computed<Partial<TradePlanFormValue>>(() => ({
  diaryId: routePrefill.value?.diaryId ?? '',
  symbol: routePrefill.value ? routePrefill.value.symbol : (statePrefill.value.symbol ?? ''),
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
