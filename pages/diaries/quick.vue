<template>
  <div class="space-y-6">
    <header class="space-y-2 pt-2">
      <h1 class="text-3xl font-bold tracking-tight md:text-4xl" style="color: var(--color-text); font-family: var(--font-display);">
        {{ t('quickDiary.title') }}
      </h1>
      <p class="max-w-xl text-base leading-relaxed" style="color: var(--color-text-muted);">
        {{ t('quickDiary.page.intro') }}
      </p>
    </header>

    <main>
      <QuickDiaryOneLiner v-if="isHydrated" />
      <section
        v-else
        class="rounded-3xl border p-6 shadow-sm md:p-8"
        style="border-color: var(--color-border); background: var(--color-surface);"
      >
        <p class="text-sm font-medium" style="color: var(--color-text-muted);">
          {{ t('common.loading') }}
        </p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import QuickDiaryOneLiner from '~/components/QuickDiaryOneLiner.vue'
const { t } = useI18n()
const isHydrated = ref(false)

onMounted(() => {
  isHydrated.value = true
})

definePageMeta({
  middleware: 'auth'
})
</script>
