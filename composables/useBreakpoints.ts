import { ref, onMounted, onUnmounted } from 'vue'

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
}

export function useBreakpoints() {
  const width = ref(0)
  const current = ref<keyof typeof breakpoints>('sm')

  const calculate = () => {
    width.value = window.innerWidth
    if (width.value >= breakpoints.xl) current.value = 'xl'
    else if (width.value >= breakpoints.lg) current.value = 'lg'
    else if (width.value >= breakpoints.md) current.value = 'md'
    else current.value = 'sm'
  }

  onMounted(() => {
    calculate()
    window.addEventListener('resize', calculate)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', calculate)
  })

  return {
    width,
    current,
    breakpoints,
  }
}