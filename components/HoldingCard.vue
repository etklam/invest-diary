<template>
  <div ref="cardElement" class="holding-card" :class="{ 'holding-card--expanded': isExpanded }" @click="toggle">
    <div class="holding-card__header">
      <div>
        <h3 class="holding-card__ticker">{{ holding.symbol }}</h3>
        <p class="holding-card__name">{{ holding.name }}</p>
      </div>
      <span :class="changeClass">{{ formatPercent(holding.changePercent) }}</span>
    </div>

    <div class="holding-card__info">
      <div><span>數量</span><span>{{ holding.quantity }} 股</span></div>
      <div><span>成本</span><span>{{ formatCurrency(holding.avgCost) }}</span></div>
    </div>

    <transition name="holding-expand">
      <div v-if="isExpanded" class="holding-card__details">
        <div><span>現值</span><span>{{ formatCurrency(currentValue) }}</span></div>
        <div :class="profitClass"><span>損益</span><span>{{ formatCurrency(profitLoss, true) }}</span></div>
        <MiniChart :data="chartData" :positive="profitLoss >= 0" :height="80" />
        <div class="holding-card__actions">
          <button @click.stop="emit('buy', holding)">買入</button>
          <button @click.stop="emit('sell', holding)">賣出</button>
          <button @click.stop="emit('details', holding)">詳情</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import MiniChart from './MiniChart.vue'
import { useSwipeGestures } from '@/composables/useGestures'

interface Holding {
  id: string
  symbol: string
  name: string
  quantity: number
  avgCost: number
  currentPrice: number
  changePercent: number
  chartData?: number[]
}

const props = defineProps<{ holding: Holding }>()
const emit = defineEmits<{
  buy: [Holding]
  sell: [Holding]
  details: [Holding]
}>()

const cardElement = ref<HTMLElement | null>(null)
const isExpanded = ref(false)

const totalCost = computed(() => props.holding.quantity * props.holding.avgCost)
const currentValue = computed(() => props.holding.quantity * props.holding.currentPrice)
const profitLoss = computed(() => currentValue.value - totalCost.value)

const chartData = computed(() => props.holding.chartData ?? [])

const changeClass = computed(() => (props.holding.changePercent >= 0 ? 'pos' : 'neg'))
const profitClass = computed(() => (profitLoss.value >= 0 ? 'pos' : 'neg'))

const formatCurrency = (n: number, sign = false) =>
  new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'USD', signDisplay: sign ? 'always' : 'auto' }).format(n)
const formatPercent = (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`

const toggle = () => (isExpanded.value = !isExpanded.value)

useSwipeGestures(cardElement, () => (isExpanded.value = true), () => (isExpanded.value = false))
</script>

<style scoped>
.holding-card{background:#fff;border-radius:12px;padding:16px;margin-bottom:12px}
.pos{color:#059669}
.neg{color:#dc2626}
.holding-expand-enter-active,.holding-expand-leave-active{transition:.25s}
.holding-expand-enter-from,.holding-expand-leave-to{opacity:0;max-height:0}
</style>