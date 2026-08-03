<template>
  <div
    class="quick-note-editor relative flex min-h-0 flex-col"
    :class="scrollable ? 'h-full' : ''"
    @keydown.esc="closeTransientPanel"
  >
    <div
      class="quick-note-editor-scroll"
      :class="scrollable ? 'min-h-0 flex-1 overflow-y-auto' : 'pb-36 lg:pb-0'"
    >
      <div class="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-7 lg:p-7">
        <section class="min-w-0 space-y-5" aria-label="隨手筆記編輯器">
          <div class="space-y-3">
            <div
              class="grid grid-cols-2 gap-1 rounded-dt-md border p-1"
              style="border-color: var(--color-border); background: var(--color-surface-muted);"
              role="tablist"
              :aria-label="t('quickDiary.editor.saveModeLabel')"
            >
              <button
                v-for="option in saveModeOptions"
                :key="option.value"
                type="button"
                role="tab"
                class="min-h-11 rounded-dt-sm px-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
                :style="saveMode === option.value
                  ? 'background: var(--color-primary); color: var(--color-on-ink); box-shadow: var(--shadow-sm);'
                  : 'background: transparent; color: var(--color-text-muted);'"
                :aria-selected="saveMode === option.value"
                @click="emit('update:save-mode', option.value)"
              >
                {{ option.label }}
              </button>
            </div>
            <p class="text-sm" style="color: var(--color-text-muted);">
              {{ saveMode === 'append' ? t('quickDiary.editor.appendContext') : t('quickDiary.editor.createContext') }}
            </p>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-semibold" style="color: var(--color-text);" for="quick-note-title">
              {{ t('quickDiary.editor.titlePlaceholder') }}
            </label>
            <input
              id="quick-note-title"
              :value="title"
              type="text"
              class="w-full rounded-dt-sm border px-4 py-3 text-base outline-none transition-colors placeholder:text-dt-text-soft focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20"
              style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
              :placeholder="t('quickDiary.editor.titlePlaceholder')"
              :aria-label="t('quickDiary.editor.titleAria')"
              @input="handleTitleInput"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-semibold" style="color: var(--color-text);" for="quick-note-content">
              {{ t('quickDiary.editor.contentAria') }}
            </label>
            <textarea
              id="quick-note-content"
              ref="contentInput"
              :value="content"
              data-test="quick-capture-input"
              class="h-44 min-h-0 w-full resize-y rounded-dt-md border px-4 py-4 text-base leading-7 outline-none transition-colors placeholder:text-dt-text-soft focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20 max-[374px]:h-36 max-[374px]:py-3 sm:h-auto sm:min-h-[400px] sm:px-5 sm:py-5"
              style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
              :placeholder="t('quickDiary.editor.contentPlaceholder')"
              rows="1"
              :autofocus="false"
              :aria-label="t('quickDiary.editor.contentAria')"
              @input="handleContentInput"
            />
          </div>

          <div class="flex flex-wrap items-center gap-2" aria-label="快捷工具">
            <button
              type="button"
              class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-dt-sm border px-3 text-sm font-semibold transition-colors hover:border-dt-primary hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
              style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-text-muted);"
              :aria-label="t('quickDiary.editor.openTagPicker')"
              @click="openPicker('tags')"
            >
              <Icon name="heroicons:hashtag" class="h-4 w-4" />
              <span>{{ t('quickDiary.tools.tags') }}</span>
            </button>
            <button
              type="button"
              class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-dt-sm border px-3 text-sm font-semibold transition-colors hover:border-dt-primary hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
              style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-text-muted);"
              :aria-label="t('quickDiary.editor.openReminderPicker')"
              @click="openPicker('reminder')"
            >
              <Icon name="heroicons:bell" class="h-4 w-4" />
              <span>{{ t('quickDiary.tools.reminders') }}</span>
            </button>
            <button
              type="button"
              class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-dt-sm border px-3 text-sm font-semibold transition-colors hover:border-dt-primary hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
              style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-text-muted);"
              :aria-expanded="templatePickerVisible"
              :aria-controls="templatePickerId"
              :aria-label="t('quickDiary.editor.openTemplatePicker')"
              @click="setTemplatePickerOpen(!templatePickerVisible)"
            >
              <Icon name="heroicons:squares-2x2" class="h-4 w-4" />
              <span>{{ t('quickDiary.editor.openTemplatePicker') }}</span>
            </button>
            <VoiceInput @result="handleVoiceResult" />
          </div>

          <div class="grid gap-2 lg:hidden">
            <button
              type="button"
              class="flex min-h-12 items-center justify-between rounded-dt-sm border px-4 text-left transition-colors hover:border-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
              style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-text);"
              :aria-label="t('quickDiary.editor.openDatePicker')"
              @click="openPicker('date')"
            >
              <span class="flex items-center gap-3">
                <Icon name="heroicons:calendar-days" class="h-4 w-4" style="color: var(--color-text-soft);" />
                <span class="text-sm">{{ t('quickDiary.date') }}</span>
              </span>
              <span class="flex items-center gap-2 text-sm" style="color: var(--color-text-muted);">
                {{ dateLabel }}
                <Icon name="heroicons:chevron-right" class="h-4 w-4" />
              </span>
            </button>
            <button
              type="button"
              class="flex min-h-12 items-center justify-between rounded-dt-sm border px-4 text-left transition-colors hover:border-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
              style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-text);"
              :aria-label="t('quickDiary.editor.openReminderPicker')"
              @click="openPicker('reminder')"
            >
              <span class="flex items-center gap-3">
                <Icon name="heroicons:bell" class="h-4 w-4" style="color: var(--color-text-soft);" />
                <span class="text-sm">{{ t('quickDiary.reminders.label') }}</span>
              </span>
              <span class="flex items-center gap-2 text-sm" style="color: var(--color-text-muted);">
                {{ reminderLabel }}
                <Icon name="heroicons:chevron-right" class="h-4 w-4" />
              </span>
            </button>
            <button
              type="button"
              class="flex min-h-12 items-center justify-between rounded-dt-sm border px-4 text-left transition-colors hover:border-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
              style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-text);"
              :aria-label="t('quickDiary.editor.openTagPicker')"
              @click="openPicker('tags')"
            >
              <span class="flex items-center gap-3">
                <Icon name="heroicons:tag" class="h-4 w-4" style="color: var(--color-text-soft);" />
                <span class="text-sm">{{ t('quickDiary.tools.tags') }}</span>
              </span>
              <span class="flex max-w-[58%] items-center gap-2 text-sm" style="color: var(--color-text-muted);">
                <span v-if="tags.length" class="truncate">{{ selectedTagSummary }}</span>
                <span v-else>{{ t('quickDiary.editor.unset') }}</span>
                <Icon name="heroicons:chevron-right" class="h-4 w-4 shrink-0" />
              </span>
            </button>
          </div>
        </section>

        <aside class="hidden min-h-0 space-y-4 lg:block" aria-label="筆記資訊">
          <section
            class="space-y-1 rounded-dt-md border p-4"
            style="border-color: var(--color-border); background: var(--color-surface);"
          >
            <div class="flex items-center justify-between gap-3 border-b pb-3" style="border-color: var(--color-border);">
              <span class="text-sm font-semibold" style="color: var(--color-text);">{{ t('quickDiary.editor.metadata') }}</span>
              <span class="text-xs" style="color: var(--color-text-soft);">{{ draftHint }}</span>
            </div>

            <div class="flex items-center justify-between gap-3 border-b py-3" style="border-color: var(--color-border);">
              <span class="flex items-center gap-2 text-sm" style="color: var(--color-text-muted);">
                <Icon name="heroicons:calendar-days" class="h-4 w-4" />
                {{ t('quickDiary.date') }}
              </span>
              <input
                id="quick-note-date"
                type="date"
                :value="date"
                class="min-h-10 rounded-dt-sm border px-2.5 text-right text-sm outline-none transition-colors focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20"
                style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
                :aria-label="t('quickDiary.editor.openDatePicker')"
                @input="handleDateInput"
              />
            </div>

            <button
              type="button"
              class="flex min-h-12 w-full items-center justify-between gap-3 border-b py-3 text-left transition-colors hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
              style="border-color: var(--color-border); color: var(--color-text-muted);"
              @click="openPicker('reminder')"
            >
              <span class="flex items-center gap-2 text-sm">
                <Icon name="heroicons:bell" class="h-4 w-4" />
                {{ t('quickDiary.reminders.label') }}
              </span>
              <span class="flex items-center gap-2 text-xs" style="color: var(--color-text-soft);">
                {{ reminderLabel }}
                <Icon name="heroicons:chevron-right" class="h-4 w-4" />
              </span>
            </button>

            <div class="pt-4">
              <QuickTags :model-value="tags" @update:model-value="emit('update:tags', $event)" />
            </div>
          </section>

          <section
            class="space-y-3 rounded-dt-md border p-4"
            style="border-color: var(--color-border); background: var(--color-surface);"
          >
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-sm font-semibold" style="color: var(--color-text);">{{ t('quickDiary.editor.quickTemplates') }}</h3>
              <button
                type="button"
                class="min-h-10 rounded-dt-sm px-2 text-xs font-semibold transition-colors hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
                style="color: var(--color-text-soft);"
                @click="openTemplateManager"
              >
                {{ t('quickDiary.editor.manageTemplates') }}
              </button>
            </div>
            <div class="grid gap-1.5">
              <button
                v-for="template in templates.slice(0, 6)"
                :key="template.id"
                type="button"
                class="flex min-h-10 items-center gap-2 rounded-dt-sm px-2.5 text-left text-xs transition-colors hover:bg-dt-surface-muted hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
                style="color: var(--color-text-muted);"
                @click="applyQuickTemplate(template.content)"
              >
                <Icon name="heroicons:document-text" class="h-4 w-4 shrink-0" style="color: var(--color-text-soft);" />
                <span class="truncate">{{ template.name }}</span>
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>

    <div
      class="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-7"
      :class="scrollable ? '' : 'sticky bottom-20 z-20 lg:static'"
      style="border-color: var(--color-border); background: var(--color-surface); padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
    >
      <div class="flex min-h-10 items-center gap-2 text-xs" aria-live="polite">
        <span
          class="h-2 w-2 shrink-0 rounded-full"
          :class="saving ? 'animate-pulse' : ''"
          :style="{ background: saving ? 'var(--color-primary)' : 'var(--color-accent)' }"
        />
        <span style="color: var(--color-text-muted);">{{ draftHint }}</span>
        <button
          v-if="draftStatus === 'failed'"
          type="button"
          class="font-semibold underline underline-offset-2 transition-colors hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
          style="color: var(--color-primary);"
          @click="emit('retry-draft')"
        >
          {{ t('quickDiary.draft.retry') }}
        </button>
      </div>
      <div class="flex gap-3 sm:min-w-[300px] sm:justify-end">
        <button
          type="button"
          class="min-h-11 flex-1 rounded-dt-sm border px-5 text-sm font-semibold transition-colors hover:border-dt-border-strong hover:bg-dt-surface-muted focus:outline-none focus:ring-2 focus:ring-dt-primary/30 sm:flex-none"
          style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-text-muted);"
          @click="emit('cancel')"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          data-test="quick-capture-save"
          class="group relative min-h-11 flex-1 overflow-hidden rounded-dt-sm px-6 text-sm font-semibold text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-dt-primary/40 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          style="background: var(--color-primary); box-shadow: var(--shadow-sm);"
          :disabled="saving"
          @click="emit('save')"
        >
          <span class="relative z-10 inline-flex items-center gap-2">
            <Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
            {{ saving ? (savingLabel || t('common.loading')) : (saveLabel || t('common.save')) }}
          </span>
        </button>
      </div>
    </div>

    <div
      v-show="activePicker"
      class="fixed inset-0 z-[70]"
      :aria-hidden="!activePicker"
    >
      <div class="absolute inset-0 bg-black/45" @click="closePicker" />
      <section
        ref="pickerPanel"
        class="absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto rounded-t-dt-lg border p-5 shadow-dt-lg sm:p-6 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[min(560px,calc(100vw-48px))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-dt-md"
        style="border-color: var(--color-border); background: var(--color-surface);"
        role="dialog"
        aria-modal="true"
        :aria-label="pickerTitle"
        tabindex="-1"
        @keydown="handlePickerKeydown"
      >
        <div class="mb-5 flex items-center justify-between gap-4">
          <h2 class="text-lg font-semibold" style="color: var(--color-text);">{{ pickerTitle }}</h2>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-dt-sm transition-colors hover:bg-dt-surface-muted focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
            style="color: var(--color-text-soft);"
            :aria-label="t('quickDiary.editor.closePicker')"
            @click="closePicker"
          >
            <Icon name="heroicons:x-mark" class="h-5 w-5" />
          </button>
        </div>

        <div v-show="activePicker === 'date'" class="space-y-3">
          <label class="block text-sm font-semibold" style="color: var(--color-text-muted);" for="quick-note-date-mobile">
            {{ t('quickDiary.date') }}
          </label>
          <input
            id="quick-note-date-mobile"
            type="date"
            :value="date"
            class="min-h-12 w-full rounded-dt-sm border px-4 text-base outline-none transition-colors focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20"
            style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
            @input="handleDateInput"
          />
          <button type="button" class="min-h-11 w-full rounded-dt-sm bg-dt-primary px-4 text-sm font-semibold text-white" @click="closePicker">
            {{ t('common.save') }}
          </button>
        </div>

        <div v-show="activePicker === 'tags'" class="space-y-4">
          <QuickTags :model-value="tags" @update:model-value="emit('update:tags', $event)" />
          <button type="button" class="min-h-11 w-full rounded-dt-sm bg-dt-primary px-4 text-sm font-semibold text-white" @click="closePicker">
            {{ t('common.save') }}
          </button>
        </div>

        <div v-show="activePicker === 'reminder'" class="space-y-4">
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="option in quickReminderOptions"
              :key="option.preset"
              type="button"
              class="min-h-11 rounded-dt-sm border px-2 text-sm font-semibold transition-colors hover:border-dt-primary hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
              style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-muted);"
              @click="emit('set-quick-reminder', option.preset)"
            >
              {{ option.label }}
            </button>
          </div>
          <div
            v-if="reminders.reminder1"
            class="flex items-center justify-between gap-3 rounded-dt-sm border px-3 py-2.5 text-sm"
            style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-muted);"
          >
            <span>{{ reminderLabel }}</span>
            <button
              type="button"
              class="min-h-9 rounded-dt-sm px-2 text-xs font-semibold transition-colors hover:text-dt-danger focus:outline-none focus:ring-2 focus:ring-dt-danger/30"
              style="color: var(--color-text-soft);"
              @click="emit('reminder-clear', { key: 'reminder1' })"
            >
              {{ t('quickDiary.reminders.cleared') }}
            </button>
          </div>
          <button
            type="button"
            class="flex min-h-11 w-full items-center justify-between rounded-dt-sm border px-3 text-sm font-semibold transition-colors hover:border-dt-primary hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
            style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-muted);"
            @click="showCustomReminder = !showCustomReminder"
          >
            {{ t('quickDiary.editor.customReminder') }}
            <Icon name="heroicons:chevron-down" class="h-4 w-4" :class="showCustomReminder ? 'rotate-180' : ''" />
          </button>
          <div v-show="showCustomReminder">
            <QuickReminder :reminders="reminders" @set="emit('reminder-set', $event)" @clear="emit('reminder-clear', $event)" />
          </div>
        </div>
      </section>
    </div>

    <div
      v-if="templatePickerVisible"
      :id="templatePickerId"
      class="fixed inset-0 z-[65]"
      :aria-hidden="!templatePickerVisible"
    >
      <div class="absolute inset-0 bg-black/45" @click="setTemplatePickerOpen(false)" />
      <section
        class="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-dt-lg border p-5 shadow-dt-lg sm:p-6 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[min(720px,calc(100vw-48px))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-dt-md"
        style="border-color: var(--color-border); background: var(--color-surface);"
        role="dialog"
        aria-modal="true"
        :aria-label="t('quickDiary.editor.openTemplatePicker')"
      >
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold" style="color: var(--color-text);">{{ t('quickDiary.editor.quickTemplates') }}</h2>
            <p class="mt-1 text-sm" style="color: var(--color-text-muted);">{{ t('quickDiary.modal.templateSubcopy') }}</p>
          </div>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-dt-sm transition-colors hover:bg-dt-surface-muted focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
            style="color: var(--color-text-soft);"
            :aria-label="t('quickDiary.editor.closePicker')"
            @click="setTemplatePickerOpen(false)"
          >
            <Icon name="heroicons:x-mark" class="h-5 w-5" />
          </button>
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <button
            v-for="option in templateOptions"
            :key="option.kind"
            type="button"
            class="flex min-h-14 items-center gap-3 rounded-dt-sm border px-3 text-left transition-colors hover:border-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
            :style="templateKind === option.kind
              ? 'border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 9%, var(--color-surface-muted)); color: var(--color-primary);'
              : 'border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-muted);'"
            :aria-pressed="templateKind === option.kind"
            @click="selectTemplateKind(option.kind)"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-dt-sm border" style="border-color: var(--color-border); background: var(--color-surface);">
              <Icon name="heroicons:document-text" class="h-4 w-4" />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-semibold">{{ option.label }}</span>
              <span v-if="option.description" class="mt-0.5 block truncate text-xs" style="color: var(--color-text-soft);">{{ option.description }}</span>
            </span>
          </button>
        </div>

        <div v-if="templates.length" class="mt-5 space-y-2 border-t pt-5" style="border-color: var(--color-border);">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-semibold uppercase tracking-[0.12em]" style="color: var(--color-text-soft);">{{ t('quickDiary.editor.quickTemplates') }}</p>
            <button
              type="button"
              class="min-h-10 rounded-dt-sm px-2 text-xs font-semibold transition-colors hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
              style="color: var(--color-text-muted);"
              @click="openTemplateManager"
            >
              {{ t('quickDiary.editor.manageTemplates') }}
            </button>
          </div>
          <div class="grid gap-1.5 sm:grid-cols-2">
            <button
              v-for="template in templates"
              :key="`picker-${template.id}`"
              type="button"
              class="flex min-h-11 items-center gap-2 rounded-dt-sm px-2.5 text-left text-sm transition-colors hover:bg-dt-surface-muted hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
              style="color: var(--color-text-muted);"
              @click="applyQuickTemplate(template.content)"
            >
              <Icon name="heroicons:document-text" class="h-4 w-4 shrink-0" style="color: var(--color-text-soft);" />
              <span class="truncate">{{ template.name }}</span>
            </button>
          </div>
        </div>

        <div v-if="templateKind !== 'blank'" class="mt-5 border-t pt-5" style="border-color: var(--color-border);">
          <QuickNoteTemplateAssistant
            :template-kind="templateKind"
            :template-data="templateData"
            :has-template-changes-pending="hasTemplateChangesPending"
            @update:template-data="emit('update:template-data', $event)"
            @apply-template-changes="emit('apply-template-changes')"
            @regenerate-template="emit('regenerate-template')"
          />
        </div>
      </section>
    </div>

    <TemplateManager v-model="showTemplateManager" @apply="emit('apply-template', $event)" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import QuickTags from '~/components/QuickTags.vue'
import VoiceInput from '~/components/VoiceInput.vue'
import TemplateManager from '~/components/TemplateManager.vue'
import QuickReminder from '~/components/QuickReminder.vue'
import QuickNoteTemplateAssistant from '~/components/quicknote/QuickNoteTemplateAssistant.vue'
import { createQuickReminderOptions } from '~/lib/quicknote/quick-reminders'
import { createEmptyQuickNoteTemplateData, type QuickNoteTemplateData } from '~/types/quicknote'
import type {
  QuickNoteQuickReminderPreset,
  QuickNoteReminderKey,
  QuickNoteReminders,
  QuickNoteSaveMode,
  QuickNoteTemplateKind,
} from '~/types/quicknote'
import type { QuickNoteTemplate } from '~/composables/useQuickNoteTemplates'

interface QuickNoteTemplateOption {
  kind: QuickNoteTemplateKind
  label: string
  description?: string
}

type PickerKind = 'tags' | 'reminder' | 'date'

const props = withDefaults(defineProps<{
  title: string
  content: string
  tags: string[]
  date: string
  saveMode: QuickNoteSaveMode
  saving: boolean
  draftHint: string
  draftStatus?: 'idle' | 'saving' | 'saved' | 'failed'
  saveLabel?: string
  savingLabel?: string
  templates: QuickNoteTemplate[]
  reminders: QuickNoteReminders
  activeReminders: Array<{ key: string; label: string; remaining: string }>
  templateKind?: QuickNoteTemplateKind
  templateData?: QuickNoteTemplateData
  hasTemplateChangesPending?: boolean
  templateOptions?: QuickNoteTemplateOption[]
  templatePickerOpen?: boolean
  autofocus?: boolean
  scrollable?: boolean
}>(), {
  draftStatus: 'idle',
  templateKind: 'blank',
  templateData: () => createEmptyQuickNoteTemplateData(),
  hasTemplateChangesPending: false,
  templates: () => [],
  reminders: () => ({ reminder1: null }),
  activeReminders: () => [],
  autofocus: false,
  scrollable: false,
})

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'update:content', value: string): void
  (e: 'update:tags', value: string[]): void
  (e: 'update:date', value: string): void
  (e: 'update:save-mode', value: QuickNoteSaveMode): void
  (e: 'append-text', value: string): void
  (e: 'apply-template', value: string): void
  (e: 'update:template-data', value: Partial<QuickNoteTemplateData>): void
  (e: 'apply-template-changes'): void
  (e: 'regenerate-template'): void
  (e: 'save'): void
  (e: 'cancel'): void
  (e: 'retry-draft'): void
  (e: 'set-quick-reminder', value: QuickNoteQuickReminderPreset): void
  (e: 'reminder-set', payload: { key: QuickNoteReminderKey; time: string }): void
  (e: 'reminder-clear', payload: { key: QuickNoteReminderKey }): void
  (e: 'update:template-picker-open', value: boolean): void
  (e: 'select-template-kind', value: QuickNoteTemplateKind): void
}>()

const { t } = useI18n()
const contentInput = ref<HTMLTextAreaElement | null>(null)
const pickerPanel = ref<HTMLElement | null>(null)
const activePicker = ref<PickerKind | null>(null)
const showCustomReminder = ref(false)
const showTemplateManager = ref(false)
const internalTemplatePickerOpen = ref(false)
const templatePickerId = 'quick-note-template-picker'

const scrollable = computed(() => props.scrollable)
const templatePickerVisible = computed(() => props.templatePickerOpen ?? internalTemplatePickerOpen.value)
const templateData = computed(() => props.templateData)

const saveModeOptions = computed<Array<{ value: QuickNoteSaveMode; label: string }>>(() => [
  { value: 'create', label: t('quickDiary.saveModes.create.label') },
  { value: 'append', label: t('quickDiary.saveModes.append.label') },
])

const fallbackTemplateOptions = computed<QuickNoteTemplateOption[]>(() => [
  {
    kind: 'blank',
    label: t('quickDiary.templates.blank'),
    description: t('quickDiary.templates.blankDesc'),
  },
  {
    kind: 'trading',
    label: t('quickDiary.templates.trading'),
    description: t('quickDiary.templates.tradingDesc'),
  },
  {
    kind: 'reflection',
    label: t('quickDiary.templates.reflection'),
    description: t('quickDiary.templates.reflectionDesc'),
  },
  {
    kind: 'observation',
    label: t('quickDiary.templates.observation'),
    description: t('quickDiary.templates.observationDesc'),
  },
])

const templateOptions = computed(() => props.templateOptions?.length ? props.templateOptions : fallbackTemplateOptions.value)
const quickReminderOptions = computed(() => createQuickReminderOptions(t))
const dateLabel = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return props.date === today ? t('quickDiary.editor.today') : props.date
})
const reminderLabel = computed(() => {
  const value = props.reminders.reminder1
  if (!value) return t('quickDiary.editor.unset')
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString() : t('quickDiary.editor.unset')
})
const selectedTagSummary = computed(() => props.tags.map(tag => `#${tag}`).join(' · '))
const pickerTitle = computed(() => {
  if (activePicker.value === 'tags') return t('quickDiary.editor.tagPickerTitle')
  if (activePicker.value === 'reminder') return t('quickDiary.editor.reminderPickerTitle')
  return t('quickDiary.editor.datePickerTitle')
})

function handleContentInput(event: Event) {
  emit('update:content', (event.target as HTMLTextAreaElement).value)
}

function handleTitleInput(event: Event) {
  emit('update:title', (event.target as HTMLInputElement).value)
}

function handleDateInput(event: Event) {
  emit('update:date', (event.target as HTMLInputElement).value)
}

function handleVoiceResult(transcript: string) {
  emit('append-text', transcript)
}

function openPicker(kind: PickerKind) {
  activePicker.value = kind
  nextTick(() => {
    const target = pickerPanel.value?.querySelector<HTMLElement>('button, input, textarea, select')
    target?.focus()
  })
}

function closePicker() {
  activePicker.value = null
}

function closeTransientPanel() {
  if (activePicker.value) {
    closePicker()
    return
  }
  if (templatePickerVisible.value) setTemplatePickerOpen(false)
}

function setTemplatePickerOpen(value: boolean) {
  if (props.templatePickerOpen !== undefined) {
    emit('update:template-picker-open', value)
  } else {
    internalTemplatePickerOpen.value = value
  }
}

function selectTemplateKind(kind: QuickNoteTemplateKind) {
  emit('select-template-kind', kind)
}

function applyQuickTemplate(content: string) {
  if (!content) return
  emit('apply-template', content)
  setTemplatePickerOpen(false)
}

function openTemplateManager() {
  showTemplateManager.value = true
}

function handlePickerKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closePicker()
    return
  }
  if (event.key !== 'Tab' || !pickerPanel.value) return

  const focusable = Array.from(pickerPanel.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
  ))
  if (!focusable.length) return

  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function focusContent() {
  if (!props.autofocus || props.content.trim() || !contentInput.value) return
  contentInput.value.focus()
}

watch(() => props.autofocus, () => nextTick(focusContent), { immediate: true })

onMounted(() => {
  nextTick(focusContent)
})
</script>

<style scoped>
@media (max-width: 639px) and (max-height: 800px) {
  #quick-note-content {
    height: 5rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    line-height: 1.4;
  }
}
</style>
