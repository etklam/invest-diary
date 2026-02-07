<template>
  <div v-if="pending" class="text-center py-12">
    <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-indigo-600" />
    <p class="mt-2 text-gray-500">載入中...</p>
  </div>

  <div v-else-if="error" class="bg-red-50 p-4 rounded-md">
    <div class="flex">
      <div class="flex-shrink-0">
        <Icon name="heroicons:x-circle" class="h-5 w-5 text-red-400" />
      </div>
      <div class="ml-3">
        <h3 class="text-sm font-medium text-red-800">載入失敗</h3>
        <div class="mt-2 text-sm text-red-700">
          {{ error.message }}
        </div>
      </div>
    </div>
  </div>

  <div v-else class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">編輯日記</h1>
    </div>

    <form @submit.prevent="saveDiary" class="space-y-8">
      <DiaryEditor
        v-model:title="form.title"
        v-model:content="form.content"
      />

      <TransactionInput v-model="form.transactions" />

      <div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">提醒設定</h3>
          <button
            type="button"
            @click="addAlert"
            class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Icon name="heroicons:plus" class="mr-2 h-4 w-4" />
            新增提醒
          </button>
        </div>

        <div v-if="form.alerts.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
          尚無提醒
        </div>

        <div v-else class="space-y-4">
          <div v-for="(alert, index) in form.alerts" :key="index" class="flex items-start space-x-4 bg-gray-50 dark:bg-gray-700 p-3 rounded-md relative">
            <button
              type="button"
              @click="removeAlert(index)"
              class="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            >
              <Icon name="heroicons:x-mark" class="h-5 w-5" />
            </button>
            
            <div class="flex-grow grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label :for="`alert-msg-${index}`" class="block text-xs font-medium text-gray-700 dark:text-gray-300">訊息</label>
                <input
                  type="text"
                  :id="`alert-msg-${index}`"
                  v-model="alert.message"
                  class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  placeholder="提醒內容"
                />
              </div>
              <div>
                <label :for="`alert-time-${index}`" class="block text-xs font-medium text-gray-700 dark:text-gray-300">觸發時間</label>
                <input
                  type="datetime-local"
                  :id="`alert-time-${index}`"
                  v-model="alert.trigger_at"
                  class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end space-x-3">
        <NuxtLink
          :to="`/diaries/${id}`"
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
        >
          取消
        </NuxtLink>
        <button
          type="submit"
          :disabled="saving"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <Icon v-if="saving" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
          儲存變更
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const id = route.params.id
const saving = ref(false)

const { data: diary, pending, error } = await useFetch(`/api/diaries/${id}`)

const form = reactive({
  title: '',
  content: '',
  transactions: [] as any[],
  alerts: [] as any[]
})

watch(diary, (newDiary) => {
  if (newDiary) {
    form.title = newDiary.title
    form.content = newDiary.content
    form.transactions = newDiary.transactions.map((t: any) => ({
      ...t,
      trade_date: new Date(t.trade_date).toISOString().slice(0, 16)
    }))
    form.alerts = newDiary.alerts.map((a: any) => ({
      ...a,
      trigger_at: new Date(a.trigger_at).toISOString().slice(0, 16)
    }))
  }
}, { immediate: true })

const addAlert = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset() + 60)
  
  form.alerts.push({
    message: '',
    trigger_at: now.toISOString().slice(0, 16)
  })
}

const removeAlert = (index: number) => {
  form.alerts.splice(index, 1)
}

const saveDiary = async () => {
  if (!form.title) {
    alert('請輸入標題')
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form,
      transactions: form.transactions.map(t => ({
        ...t,
        trade_date: new Date(t.trade_date).toISOString()
      })),
      alerts: form.alerts.map(a => ({
        ...a,
        trigger_at: new Date(a.trigger_at).toISOString()
      }))
    }

    await $fetch(`/api/diaries/${id}`, {
      method: 'PUT',
      body: payload
    })
    
    router.push(`/diaries/${id}`)
  } catch (e: any) {
    console.error(e)
    alert('儲存失敗: ' + (e.data?.statusMessage || e.message))
  } finally {
    saving.value = false
  }
}
</script>
