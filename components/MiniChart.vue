<template>
  <div class="mini-chart" :class="{ 'mini-chart--positive': positive, 'mini-chart--negative': !positive }">
    <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" class="mini-chart__svg">
      <path :d="chartPath" class="mini-chart__path" :class="pathClass" />
      <defs>
        <linearGradient :id="gradientId" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" :class="positive ? 'mini-chart__gradient-stop--positive' : 'mini-chart__gradient-stop--negative'" />
          <stop offset="100%" class="mini-chart__gradient-stop--transparent" />
        </linearGradient>
      </defs>
      <path :d="fillPath" class="mini-chart__fill" :style="{ fill: `url(#${gradientId})` }" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  data: number[]
  width?: number
  height?: number
  positive?: boolean
  smooth?: boolean
}>(), {
  width: 200,
  height: 80,
  positive: true,
  smooth: true
})

const gradientId = computed(() => `chart-gradient-${Math.random().toString(36).slice(2)}`)

const pathClass = computed(() => ({
  'mini-chart__path--positive': props.positive,
  'mini-chart__path--negative': !props.positive
}))

const points = computed<Array<{ x: number; y: number }>>(() => {
  if (!props.data || props.data.length === 0) return []
  const min = Math.min(...props.data)
  const max = Math.max(...props.data)
  const range = max - min || 1
  return props.data.map((v, i) => ({
    x: (i / Math.max(1, props.data.length - 1)) * props.width,
    y: props.height - ((v - min) / range) * props.height
  }))
})

const generateSmoothPath = (pts: Array<{ x: number; y: number }>) => {
  if (pts.length < 2) return ''
  const first = pts[0]
  if (!first) return ''
  let d = `M ${first.x} ${first.y}`
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1]
    const p1 = pts[i]
    if (!p0 || !p1) continue
    const c1x = p0.x + (p1.x - p0.x) / 3
    const c1y = p0.y
    const c2x = p0.x + (2 * (p1.x - p0.x)) / 3
    const c2y = p1.y
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`
  }
  return d
}

const chartPath = computed(() => {
  if (!points.value.length) return ''
  return props.smooth
    ? generateSmoothPath(points.value)
    : points.value.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
})

const fillPath = computed(() => {
  if (!points.value.length) return ''
  return `${chartPath.value} L ${props.width} ${props.height} L 0 ${props.height} Z`
})
</script>

<style scoped>
.mini-chart__svg{width:100%;height:100%}
.mini-chart__path{fill:none;stroke-width:2}
.mini-chart__path--positive{stroke:#059669}
.mini-chart__path--negative{stroke:#dc2626}
.mini-chart__fill{opacity:.2}
.mini-chart__gradient-stop--positive{stop-color:#059669}
.mini-chart__gradient-stop--negative{stop-color:#dc2626}
.mini-chart__gradient-stop--transparent{stop-opacity:0}
</style>