<template>
  <div
    v-if="showStatus"
    class="fixed bottom-4 right-4 z-40"
  >
    <div
      class="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm"
      :class="statusClass"
    >
      <Icon
        :name="statusIcon"
        class="w-4 h-4"
      />
      <span>{{ statusText }}</span>
      <button
        v-if="healthError"
        @click="showDetails = !showDetails"
        class="ml-2 hover:opacity-80"
      >
        <Icon
          name="heroicons:information-circle"
          class="w-4 h-4"
        />
      </button>
    </div>

    <!-- Error details -->
    <div
      v-if="showDetails && healthError"
      class="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-sm max-w-xs"
    >
      <p class="font-medium text-red-600 dark:text-red-400 mb-1">Health Check Failed</p>
      <p class="text-gray-600 dark:text-gray-400">{{ healthError }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const showStatus = ref(false)
const showDetails = ref(false)
const isHealthy = ref(true)
const healthError = ref('')

const statusClass = computed(() => {
  if (isHealthy.value) {
    return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
  }
  return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
})

const statusIcon = computed(() => {
  return isHealthy.value ? 'heroicons:check-circle' : 'heroicons:x-circle'
})

const statusText = computed(() => {
  return isHealthy.value ? '系統正常' : '系統異常'
})

async function checkHealth() {
  try {
    const response = await $fetch('/api/health')
    isHealthy.value = response.status === 'healthy'
    healthError.value = ''
  } catch (error: any) {
    isHealthy.value = false
    healthError.value = error.message || '無法連接系統'
  }
}

// Check health on mount
onMounted(() => {
  checkHealth()
  showStatus.value = true

  // Check health every 30 seconds
  const interval = setInterval(checkHealth, 30000)

  onUnmounted(() => {
    clearInterval(interval)
  })
})

// Expose checkHealth for manual refresh
defineExpose({
  checkHealth
})
</script>
