<template>
  <div class="space-y-6">
    <section
      class="relative overflow-hidden rounded-[32px] border p-8 shadow-xl md:p-12 lg:p-16"
      style="border-color: var(--color-border); background: linear-gradient(135deg, color-mix(in srgb, var(--color-surface) 94%, var(--color-background)), color-mix(in srgb, var(--color-surface-strong) 72%, var(--color-background)));"
    >
      <div class="relative z-10 grid gap-8 md:grid-cols-[1fr_320px] lg:gap-16">
        <div class="space-y-6">
          <div class="inline-flex items-center gap-2 rounded-full px-4 py-1.5 shadow-sm" style="background: color-mix(in srgb, var(--color-secondary) 12%, var(--color-surface-muted)); color: var(--color-secondary);">
            <Icon name="heroicons:sparkles" class="h-4 w-4" />
            <span class="text-[10px] font-bold uppercase tracking-[0.2em]">{{ t('quickDiary.page.eyebrow') }}</span>
          </div>
          
          <div class="space-y-4">
            <h1 class="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl" style="color: var(--color-text); font-family: var(--font-display);">
              {{ t('quickDiary.title') }}
            </h1>
            <p class="max-w-2xl text-lg leading-relaxed md:text-xl" style="color: var(--color-text-muted);">
              {{ t('quickDiary.page.intro') }}
            </p>
          </div>
        </div>

        <aside
          class="flex flex-col justify-center rounded-[24px] border p-6 shadow-inner-sm md:p-8"
          style="border-color: color-mix(in srgb, var(--color-primary) 15%, var(--color-border)); background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-strong));"
        >
          <div class="flex items-center gap-2 mb-5">
            <div class="h-1.5 w-6 rounded-full" style="background: var(--color-primary);" />
            <p class="text-[10px] font-bold uppercase tracking-[0.2em]" style="color: var(--color-primary);">{{ t('quickDiary.page.rhythmTitle') }}</p>
          </div>
          <ul class="space-y-4 text-sm font-medium leading-relaxed" style="color: var(--color-text-soft);">
            <li class="flex gap-3">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style="background: var(--color-primary-soft);" />
              {{ t('quickDiary.page.rhythm.template') }}
            </li>
            <li class="flex gap-3">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style="background: var(--color-primary-soft);" />
              {{ t('quickDiary.page.rhythm.saveMode') }}
            </li>
            <li class="flex gap-3">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style="background: var(--color-primary-soft);" />
              {{ t('quickDiary.page.rhythm.tags') }}
            </li>
          </ul>
        </aside>
      </div>

      <!-- Decorative background elements -->
      <div class="absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-10 blur-3xl" style="background: var(--color-primary);" />
      <div class="absolute -bottom-24 -left-24 h-96 w-96 rounded-full opacity-5 blur-3xl" style="background: var(--color-secondary);" />
    </section>

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
