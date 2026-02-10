<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '~/composables/useToast'

const toast = useToast()
const content = ref('')
const loading = ref(false)
const list = ref<{ id: number; content: string; createdAt: string }[]>([])

const fetchList = async () => {
  list.value = await $fetch('/api/discipline')
}

const submit = async () => {
  if (!content.value.trim()) {
    toast.error('請輸入交易紀律')
    return
  }

  loading.value = true
  try {
    await $fetch('/api/discipline', {
      method: 'POST',
      body: { content: content.value },
    })
    content.value = ''
    await fetchList()
    toast.success('已新增交易紀律')
  } catch (e) {
    toast.error('新增失敗')
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="max-w-2xl mx-auto p-4 space-y-6">
    <h1 class="text-2xl font-bold">交易紀律</h1>

    <div class="space-y-2">
      <textarea
        v-model="content"
        rows="3"
        class="w-full border rounded p-2"
        placeholder="輸入一句提醒自己的交易原則"
      />
      <button
        class="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
        :disabled="loading"
        @click="submit"
      >
        新增紀律
      </button>
    </div>

    <div v-if="list.length === 0" class="text-gray-400">
      還沒有任何交易紀律
    </div>

    <div class="space-y-3">
      <div
        v-for="item in list"
        :key="item.id"
        class="border rounded p-4"
      >
        <div class="text-lg">{{ item.content }}</div>
        <div class="text-xs text-gray-400 mt-1">
          {{ new Date(item.createdAt).toLocaleString() }}
        </div>
      </div>
    </div>
  </div>
</template>