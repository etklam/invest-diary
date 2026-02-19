<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <!-- Background overlay -->
          <Transition
            enter-active-class="ease-out duration-300"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="ease-in duration-200"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="show"
              class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              @click="close"
            ></div>
          </Transition>

          <!-- Center the modal -->
          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

          <Transition
            enter-active-class="ease-out duration-300"
            enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to-class="opacity-100 translate-y-0 sm:scale-100"
            leave-active-class="ease-in duration-200"
            leave-from-class="opacity-100 translate-y-0 sm:scale-100"
            leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div
              v-if="show"
              class="inline-block align-bottom bg-white dark:bg-gray-800 text-left overflow-hidden shadow-xl transform transition-all w-full h-full sm:h-auto sm:rounded-lg sm:my-8 sm:align-middle sm:max-w-2xl"
            >
              <!-- Header -->
              <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 flex justify-between items-center">
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                  快速日記
                </h3>
                <button @click="close" class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                  <Icon name="heroicons:x-mark" class="h-6 w-6" />
                </button>
              </div>

              <!-- Step 1: Choose Template -->
              <div v-if="step === 1" class="px-4 py-5 sm:p-6 overflow-y-auto max-h-[calc(100vh-8rem)]">
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">選擇一個模板開始快速創建日記</p>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <!-- Trading Diary -->
                  <button
                    @click="selectTemplate('trading')"
                    class="p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors text-left"
                  >
                    <div class="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mb-3">
                      <Icon name="heroicons:currency-dollar" class="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 class="font-medium text-gray-900 dark:text-white">交易日記</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">記錄買入/賣出操作</p>
                  </button>

                  <!-- Reflection Diary -->
                  <button
                    @click="selectTemplate('reflection')"
                    class="p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors text-left"
                  >
                    <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mb-3">
                      <Icon name="heroicons:light-bulb" class="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h4 class="font-medium text-gray-900 dark:text-white">盤後反思</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">收盤後的總結反思</p>
                  </button>

                  <!-- Observation Diary -->
                  <button
                    @click="selectTemplate('observation')"
                    class="p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors text-left"
                  >
                    <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-3">
                      <Icon name="heroicons:eye" class="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 class="font-medium text-gray-900 dark:text-white">市場觀察</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">記錄市場熱點觀察</p>
                  </button>
                </div>
              </div>

              <!-- Step 2: Fill Form -->
              <div v-else-if="step === 2" class="px-4 py-5 sm:p-6 overflow-y-auto max-h-[calc(100vh-8rem)]">
                <!-- Trading Template Form -->
                <div v-if="selectedTemplate === 'trading'" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      今日操作
                    </label>
                    <div class="flex gap-2">
                      <button
                        v-for="type in ['buy', 'sell', 'both']"
                        :key="type"
                        @click="formData.tradingType = type"
                        :class="[
                          'flex-1 px-4 py-2 border-2 rounded-lg text-sm font-medium transition-colors',
                          formData.tradingType === type
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                        ]"
                      >
                        {{ type === 'buy' ? '買入' : type === 'sell' ? '賣出' : '買賣都做' }}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      股票代碼（可選，多個用逗號分隔）
                    </label>
                    <input
                      v-model="formData.symbols"
                      type="text"
                      placeholder="例如: 2330, 2317"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      今日市場感覺
                    </label>
                    <div class="flex gap-2">
                      <button
                        v-for="mood in ['bullish', 'bearish', 'neutral']"
                        :key="mood"
                        @click="formData.marketMood = mood"
                        :class="[
                          'flex-1 px-4 py-2 border-2 rounded-lg text-sm font-medium transition-colors',
                          formData.marketMood === mood
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                        ]"
                      >
                        {{ mood === 'bullish' ? '多頭' : mood === 'bearish' ? '空頭' : '盤整' }}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      快速備註（可選）
                    </label>
                    <textarea
                      v-model="formData.note"
                      rows="3"
                      placeholder="簡單記錄今日操作心得..."
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    ></textarea>
                  </div>
                </div>

                <!-- Reflection Template Form -->
                <div v-else-if="selectedTemplate === 'reflection'" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      今日市場狀況
                    </label>
                    <select
                      v-model="formData.marketCondition"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">請選擇...</option>
                      <optgroup label="漲跌">
                        <option value="大漲">大漲</option>
                        <option value="小漲">小漲</option>
                        <option value="盤整">盤整</option>
                        <option value="小跌">小跌</option>
                        <option value="大跌">大跌</option>
                      </optgroup>
                      <optgroup label="走勢型態">
                        <option value="高開高走">高開高走</option>
                        <option value="高開低走">高開低走</option>
                        <option value="低開高走">低開高走</option>
                        <option value="低開低走">低開低走</option>
                        <option value="震盪">震盪</option>
                      </optgroup>
                      <optgroup label="市場結構">
                        <option value="個股分化">個股分化</option>
                        <option value="齊漲">齊漲</option>
                        <option value="齊跌">齊跌</option>
                        <option value="指數穩個股弱">指數穩、個股弱</option>
                        <option value="指數弱個股強">指數弱、個股強</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      今日操作評價
                    </label>
                    <div class="flex gap-2">
                      <button
                        v-for="rating in [1, 2, 3, 4, 5]"
                        :key="rating"
                        @click="formData.rating = rating"
                        :class="[
                          'flex-1 px-4 py-2 border-2 rounded-lg text-sm font-medium transition-colors',
                          formData.rating === rating
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                        ]"
                      >
                        {{ rating }} {{ rating === 1 ? '星' : '星' }}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      做得好的地方
                    </label>
                    <div class="mb-2">
                      <label class="flex items-center space-x-2 cursor-pointer">
                        <input
                          v-model="formData.noRashTrading"
                          type="checkbox"
                          class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span class="text-sm text-gray-700 dark:text-gray-300">沒有胡亂操作</span>
                      </label>
                    </div>
                    <textarea
                      v-model="formData.goodPoints"
                      rows="2"
                      placeholder="今日操作中哪些做得好？"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    ></textarea>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      需要改進的地方
                    </label>
                    <textarea
                      v-model="formData.improvePoints"
                      rows="2"
                      placeholder="哪些地方可以做得更好？"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    ></textarea>
                  </div>
                </div>

                <!-- Observation Template Form -->
                <div v-else-if="selectedTemplate === 'observation'" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      觀察主題
                    </label>
                    <input
                      v-model="formData.topic"
                      type="text"
                      placeholder="例如: 半導體板塊、台積電、美國股市..."
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      觀察類型
                    </label>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="type in ['板塊熱點', '個股走勢', '市場消息', '技術分析', '其他']"
                        :key="type"
                        @click="formData.observationType = type"
                        :class="[
                          'px-4 py-2 border-2 rounded-lg text-sm font-medium transition-colors',
                          formData.observationType === type
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                        ]"
                      >
                        {{ type }}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      觀察內容
                    </label>
                    <textarea
                      v-model="formData.content"
                      rows="4"
                      placeholder="記錄你的觀察和看法..."
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    ></textarea>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      後續行動（可選）
                    </label>
                    <input
                      v-model="formData.action"
                      type="text"
                      placeholder="例如: 持續觀察、準備進場..."
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <!-- Preview -->
                <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">預覽</h4>
                  <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                    <p class="font-medium text-gray-900 dark:text-white">{{ previewTitle }}</p>
                    <div class="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ previewContent }}</div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  v-if="step === 2"
                  @click="createDiary"
                  :disabled="saving"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  <Icon v-if="saving" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ saving ? '建立中...' : '建立日記' }}
                </button>
                <button
                  v-if="step === 2"
                  @click="step = 1"
                  type="button"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  上一步
                </button>
                <button
                  @click="close"
                  type="button"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', diaryId: string): void
}>()

const step = ref(1)
const selectedTemplate = ref<'trading' | 'reflection' | 'observation' | null>(null)
const saving = ref(false)

const formData = reactive({
  // Trading
  tradingType: '',
  symbols: '',
  marketMood: '',
  note: '',

  // Reflection
  marketCondition: '',
  rating: 0,
  noRashTrading: false,
  goodPoints: '',
  improvePoints: '',

  // Observation
  topic: '',
  observationType: '',
  content: '',
  action: ''
})

// Auto-format stock symbols: trim and uppercase
watch(() => formData.symbols, (newValue) => {
  if (newValue) {
    // Split by comma, trim each symbol, convert to uppercase, and join back
    formData.symbols = newValue
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0)
      .join(', ')
  }
})

const today = new Date().toLocaleDateString('zh-TW', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).replace(/\//g, '/')

// Preview computed
const previewTitle = computed(() => {
  if (selectedTemplate.value === 'trading') {
    const typeText = formData.tradingType === 'buy' ? '買入' : formData.tradingType === 'sell' ? '賣出' : '交易'
    const symbols = formData.symbols ? ` - ${formData.symbols}` : ''
    return `${today} ${typeText}日記${symbols}`
  } else if (selectedTemplate.value === 'reflection') {
    return `${today} 盤後反思`
  } else if (selectedTemplate.value === 'observation') {
    return formData.topic || `${today} 市場觀察`
  }
  return ''
})

const previewContent = computed(() => {
  if (selectedTemplate.value === 'trading') {
    let content = `## 今日操作\n\n`
    content += `- 操作類型：${formData.tradingType === 'buy' ? '買入' : formData.tradingType === 'sell' ? '賣出' : '買賣都做'}\n`
    if (formData.symbols) {
      content += `- 標的：${formData.symbols}\n`
    }
    content += `- 市場感覺：${formData.marketMood === 'bullish' ? '多頭' : formData.marketMood === 'bearish' ? '空頭' : '盤整'}\n`
    if (formData.note) {
      content += `\n## 備註\n\n${formData.note}\n`
    }
    return content
  } else if (selectedTemplate.value === 'reflection') {
    let content = `## 市場狀況\n\n${formData.marketCondition || '-'}\n\n`
    content += `## 今日評價\n\n${'⭐'.repeat(formData.rating)}${formData.rating > 0 ? ` (${formData.rating}/5)` : ''}\n\n`
    const goodPointsItems: string[] = []
    if (formData.noRashTrading) {
      goodPointsItems.push('- 沒有胡亂操作')
    }
    if (formData.goodPoints) {
      goodPointsItems.push(formData.goodPoints)
    }
    if (goodPointsItems.length > 0) {
      content += `## 做得好的地方\n\n${goodPointsItems.join('\n')}\n\n`
    }
    if (formData.improvePoints) {
      content += `## 需要改進的地方\n\n${formData.improvePoints}\n`
    }
    return content
  } else if (selectedTemplate.value === 'observation') {
    let content = `## 觀察主題：${formData.topic || '-'}\n\n`
    content += `**類型：** ${formData.observationType || '-'}\n\n`
    if (formData.content) {
      content += `## 觀察內容\n\n${formData.content}\n\n`
    }
    if (formData.action) {
      content += `## 後續行動\n\n${formData.action}\n`
    }
    return content
  }
  return ''
})

const close = () => {
  step.value = 1
  selectedTemplate.value = null
  Object.assign(formData, {
    tradingType: '',
    symbols: '',
    marketMood: '',
    note: '',
    marketCondition: '',
    rating: 0,
    noRashTrading: false,
    goodPoints: '',
    improvePoints: '',
    topic: '',
    observationType: '',
    content: '',
    action: ''
  })
  emit('close')
}

const selectTemplate = (template: 'trading' | 'reflection' | 'observation') => {
  selectedTemplate.value = template
  step.value = 2
}

const createDiary = async () => {
  const toast = useToast()

  if (!previewTitle.value) {
    toast.error('請填寫必要資訊')
    return
  }

  saving.value = true
  try {
    const diary = await $fetch<{ id: { toString: () => string } }>('/api/diaries', {
      method: 'POST',
      body: {
        title: previewTitle.value,
        content: previewContent.value,
        date: new Date().toISOString(),
        appendToToday: true
      }
    })

    toast.success('快速日記建立成功！')
    emit('created', String(diary.id))
    close()
  } catch (e: any) {
    console.error('Error creating quick diary:', e)
    toast.error('建立失敗：' + (e.data?.statusMessage || e.message))
  } finally {
    saving.value = false
  }
}
</script>
