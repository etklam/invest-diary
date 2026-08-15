<template>
  <div
    class="quick-note-editor relative flex min-h-0 flex-col"
    :class="scrollable ? 'h-full' : ''"
    @keydown.esc="closeTransientPanel"
  >
    <div
      class="quick-note-editor-scroll"
      :class="scrollable ? 'min-h-0 flex-1 overflow-y-auto' : 'pb-40 lg:pb-0'"
    >
      <div class="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-7 lg:p-7">
        <section class="min-w-0 space-y-4 sm:space-y-5" :aria-label="t('quickDiary.editor.contentAria')">
          <div class="hidden space-y-2 lg:block">
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
            <div
              class="overflow-hidden rounded-dt-md border transition-colors focus-within:border-dt-primary focus-within:ring-2 focus-within:ring-dt-primary/20"
              style="border-color: var(--color-border); background: var(--color-surface-muted);"
            >
              <textarea
                id="quick-note-content"
                ref="contentInput"
                :value="content"
                data-test="quick-capture-input"
                class="block w-full resize-none border-0 bg-transparent px-4 py-4 text-base leading-7 outline-none placeholder:text-dt-text-soft sm:min-h-[360px] sm:px-5 sm:py-5 lg:min-h-[330px] xl:min-h-[410px]"
                :class="scrollable ? 'min-h-[min(36svh,18rem)]' : 'min-h-[12rem] max-[374px]:min-h-[10rem]'"
                style="color: var(--color-text);"
                :placeholder="t('quickDiary.editor.contentPlaceholder')"
                rows="7"
                :aria-label="t('quickDiary.editor.contentAria')"
                @input="handleContentInput"
              />
              <div class="flex min-h-11 items-center justify-end border-t px-4 text-xs tabular-nums" style="border-color: var(--color-border); color: var(--color-text-soft); font-family: var(--font-data);">
                {{ content.length }}
              </div>
            </div>
          </div>

          <div class="overflow-hidden rounded-dt-md border lg:hidden" style="border-color: var(--color-border); background: var(--color-surface);">
            <button
              v-for="row in mobileRows"
              :key="row.kind"
              type="button"
              :data-test="`quick-note-row-${row.kind}`"
              class="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 border-b px-4 text-left transition-colors last:border-b-0 hover:bg-dt-surface-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-dt-primary/30"
              style="border-color: var(--color-border); color: var(--color-text);"
              :aria-label="row.ariaLabel"
              @click="openPicker(row.kind, $event)"
            >
              <span class="flex min-w-0 items-center gap-3">
                <Icon :name="row.icon" class="h-4 w-4 shrink-0" style="color: var(--color-text-soft);" />
                <span class="text-sm">{{ row.label }}</span>
              </span>
              <span class="flex min-w-0 max-w-[62%] items-center gap-2 text-sm" style="color: var(--color-text-muted);">
                <span class="truncate">{{ row.value }}</span>
                <Icon name="heroicons:chevron-right" class="h-4 w-4 shrink-0" />
              </span>
            </button>
          </div>

          <section class="hidden space-y-3 lg:block" aria-labelledby="save-mode-title">
            <h2 id="save-mode-title" class="text-sm font-semibold" style="color: var(--color-text);">
              {{ t('quickDiary.editor.saveModeLabel') }}
            </h2>
            <div class="grid gap-3 sm:grid-cols-2">
              <button
                v-for="option in availableSaveModeOptions"
                :key="option.value"
                type="button"
                class="flex min-h-[72px] cursor-pointer items-center justify-between gap-4 rounded-dt-sm border px-4 text-left transition-colors hover:border-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
                :style="saveMode === option.value
                  ? 'border-color: var(--color-primary); background: var(--color-surface-muted); color: var(--color-primary);'
                  : 'border-color: var(--color-border); background: var(--color-surface); color: var(--color-text);'"
                :aria-pressed="saveMode === option.value"
                @click="controller.setSaveMode(option.value)"
              >
                <span>
                  <span class="block text-sm font-semibold">{{ option.label }}</span>
                  <span class="mt-1 block text-xs" style="color: var(--color-text-soft);">{{ option.description }}</span>
                </span>
                <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border" :style="saveMode === option.value ? 'border-color: var(--color-primary);' : 'border-color: var(--color-border-strong);'">
                  <span v-if="saveMode === option.value" class="h-2.5 w-2.5 rounded-full" style="background: var(--color-primary);" />
                </span>
              </button>
            </div>
          </section>
        </section>

        <aside class="hidden min-h-0 space-y-4 lg:block" :aria-label="t('quickDiary.editor.metadata')">
          <section class="space-y-4 rounded-dt-md border p-4" style="border-color: var(--color-border); background: var(--color-surface);">
            <label class="flex items-center gap-2 text-sm font-semibold" style="color: var(--color-text);" for="quick-note-date">
              <Icon name="heroicons:calendar-days" class="h-4 w-4" />
              {{ t('quickDiary.date') }}
            </label>
            <input
              id="quick-note-date"
              type="date"
              :value="date"
              class="min-h-11 w-full rounded-dt-sm border px-3 text-sm outline-none transition-colors focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20"
              style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);"
              @input="handleDateInput"
            />
          </section>

          <button
            type="button"
            class="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-dt-md border px-4 text-left transition-colors hover:border-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
            style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-text);"
            @click="openPicker('reminder', $event)"
          >
            <span class="flex items-center gap-2 text-sm font-semibold"><Icon name="heroicons:bell" class="h-4 w-4" />{{ t('quickDiary.reminders.label') }}</span>
            <span class="flex min-w-0 items-center gap-2 text-xs" style="color: var(--color-text-muted);"><span class="truncate">{{ reminderLabel }}</span><Icon name="heroicons:chevron-right" class="h-4 w-4 shrink-0" /></span>
          </button>

          <section class="rounded-dt-md border p-4" style="border-color: var(--color-border); background: var(--color-surface);">
            <QuickTags :model-value="tags" @update:model-value="controller.setTags($event)" />
          </section>

          <section class="rounded-dt-md border p-4" style="border-color: var(--color-border); background: var(--color-surface);">
            <CompanySymbolInput
              input-id="quick-note-company-symbols"
              :model-value="stockSymbols"
              @update:model-value="controller.setStockSymbols($event)"
            />
          </section>

          <section class="space-y-3 rounded-dt-md border p-4" style="border-color: var(--color-border); background: var(--color-surface);">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold" style="color: var(--color-text);">{{ t('quickDiary.editor.quickTemplates') }}</h2>
              <button type="button" class="min-h-10 cursor-pointer rounded-dt-sm px-2 text-xs font-semibold transition-colors hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30" style="color: var(--color-text-soft);" @click="openTemplateManager">
                {{ t('quickDiary.editor.manageTemplates') }}
              </button>
            </div>
            <div class="grid gap-1">
              <button
                v-for="template in templates.slice(0, 4)"
                :key="template.id"
                type="button"
                class="flex min-h-10 cursor-pointer items-center gap-2 rounded-dt-sm px-2 text-left text-xs transition-colors hover:bg-dt-surface-muted hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
                style="color: var(--color-text-muted);"
                @click="applyQuickTemplate(template.content)"
              >
                <Icon name="heroicons:document-text" class="h-4 w-4 shrink-0" /><span class="truncate">{{ template.name }}</span>
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>

    <footer class="border-t px-4 py-3 sm:px-6 lg:px-7" style="border-color: var(--color-border); background: var(--color-surface); padding-bottom: max(0.75rem, env(safe-area-inset-bottom));">
      <div class="hidden items-center justify-between gap-4 lg:flex">
        <div class="flex min-h-10 items-center gap-2 text-xs" aria-live="polite">
          <span v-if="draftHint" class="h-2 w-2 shrink-0 rounded-full" :class="saving ? 'animate-pulse motion-reduce:animate-none' : ''" :style="{ background: saving ? 'var(--color-primary)' : 'var(--color-accent)' }" />
          <span style="color: var(--color-text-muted);">{{ draftHint }}</span>
          <button v-if="draftStatus === 'failed'" type="button" class="cursor-pointer font-semibold underline underline-offset-2 hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30" style="color: var(--color-primary);" @click="controller.retryDraftSave()">{{ t('quickDiary.draft.retry') }}</button>
        </div>
        <div class="flex gap-3">
          <button type="button" class="min-h-11 cursor-pointer rounded-dt-sm border px-5 text-sm font-semibold transition-colors hover:bg-dt-surface-muted focus:outline-none focus:ring-2 focus:ring-dt-primary/30" style="border-color: var(--color-border); color: var(--color-text-muted);" @click="controller.cancel()">{{ t('common.cancel') }}</button>
          <button type="button" data-test="quick-capture-save" class="min-h-11 cursor-pointer rounded-dt-sm px-6 text-sm font-semibold text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-dt-primary/40 disabled:cursor-not-allowed disabled:opacity-60" style="background: var(--color-primary); box-shadow: var(--shadow-sm);" :disabled="saving || !content.trim()" @click="controller.save()">
            <span class="inline-flex items-center gap-2"><Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin motion-reduce:animate-none" />{{ saving ? (savingLabel || t('common.loading')) : (saveLabel || t('quickDiary.editor.saveQuickDiary')) }}</span>
          </button>
        </div>
      </div>

      <div class="space-y-3 lg:hidden">
        <div v-if="draftStatus === 'failed'" class="flex items-center justify-between text-xs" aria-live="polite">
          <span style="color: var(--color-danger);">{{ draftHint }}</span>
          <button type="button" class="cursor-pointer font-semibold underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-dt-primary/30" style="color: var(--color-primary);" @click="controller.retryDraftSave()">{{ t('quickDiary.draft.retry') }}</button>
        </div>
        <button type="button" data-test="quick-capture-save" class="min-h-12 w-full cursor-pointer rounded-dt-sm px-5 text-sm font-semibold text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-dt-primary/40 disabled:cursor-not-allowed disabled:opacity-60" style="background: var(--color-primary); box-shadow: var(--shadow-sm);" :disabled="saving || !content.trim()" @click="controller.save()">
          <span class="inline-flex items-center gap-2"><Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin motion-reduce:animate-none" />{{ saving ? (savingLabel || t('common.loading')) : (saveLabel || t('quickDiary.editor.saveQuickDiary')) }}</span>
        </button>
        <div class="grid grid-cols-2 gap-2">
          <VoiceInput class="justify-center" @result="controller.appendVoiceTranscript" />
          <button type="button" class="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-dt-sm px-3 text-sm font-semibold transition-colors hover:bg-dt-surface-muted hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30" style="color: var(--color-text-muted);" :aria-expanded="templatePickerVisible" :aria-controls="templatePickerId" @click="setTemplatePickerOpen(!templatePickerVisible)">
            <Icon name="heroicons:document-text" class="h-4 w-4" />{{ t('quickDiary.editor.openTemplatePicker') }}
          </button>
        </div>
      </div>
    </footer>

    <div v-if="activePicker" class="fixed inset-0 z-[70]">
      <div class="absolute inset-0 bg-black/45" @click="closePicker" />
      <section
        ref="pickerPanel"
        class="absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto rounded-t-dt-lg border p-5 shadow-dt-lg sm:p-6 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[min(560px,calc(100vw-48px))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-dt-md"
        style="border-color: var(--color-border); background: var(--color-surface); padding-bottom: max(1.25rem, env(safe-area-inset-bottom));"
        role="dialog"
        aria-modal="true"
        :aria-label="pickerTitle"
        tabindex="-1"
        @keydown="handlePickerKeydown"
      >
        <div class="mb-5 flex items-center justify-between gap-4">
          <h2 class="text-lg font-semibold" style="color: var(--color-text);">{{ pickerTitle }}</h2>
          <button type="button" class="flex h-11 w-11 cursor-pointer items-center justify-center rounded-dt-sm transition-colors hover:bg-dt-surface-muted focus:outline-none focus:ring-2 focus:ring-dt-primary/30" style="color: var(--color-text-soft);" :aria-label="t('quickDiary.editor.closePicker')" @click="closePicker"><Icon name="heroicons:x-mark" class="h-5 w-5" /></button>
        </div>

        <div v-if="activePicker === 'date'" class="space-y-3">
          <label class="block text-sm font-semibold" style="color: var(--color-text-muted);" for="quick-note-date-mobile">{{ t('quickDiary.date') }}</label>
          <input id="quick-note-date-mobile" type="date" :value="date" class="min-h-12 w-full rounded-dt-sm border px-4 text-base outline-none focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20" style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);" @input="handleDateInput" />
          <button type="button" class="min-h-11 w-full cursor-pointer rounded-dt-sm bg-dt-primary px-4 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-dt-primary/40" @click="closePicker">{{ t('common.save') }}</button>
        </div>

        <div v-else-if="activePicker === 'saveMode'" class="grid gap-2">
          <button v-for="option in availableSaveModeOptions" :key="`picker-${option.value}`" type="button" class="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-dt-sm border px-4 text-left transition-colors hover:border-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30" :style="saveMode === option.value ? 'border-color: var(--color-primary); background: var(--color-surface-muted); color: var(--color-primary);' : 'border-color: var(--color-border); color: var(--color-text);'" :aria-pressed="saveMode === option.value" @click="selectSaveMode(option.value)">
            <span><span class="block text-sm font-semibold">{{ option.label }}</span><span class="mt-1 block text-xs" style="color: var(--color-text-soft);">{{ option.description }}</span></span>
            <Icon v-if="saveMode === option.value" name="heroicons:check-circle-solid" class="h-5 w-5 shrink-0" />
          </button>
        </div>

        <div v-else-if="activePicker === 'tags'" class="space-y-4">
          <QuickTags :model-value="tags" @update:model-value="controller.setTags($event)" />
          <button type="button" class="min-h-11 w-full cursor-pointer rounded-dt-sm bg-dt-primary px-4 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-dt-primary/40" @click="closePicker">{{ t('common.save') }}</button>
        </div>

        <div v-else-if="activePicker === 'reminder'" class="space-y-4">
          <div class="grid grid-cols-3 gap-2">
            <button v-for="option in quickReminderOptions" :key="option.preset" type="button" class="min-h-11 cursor-pointer rounded-dt-sm border px-2 text-sm font-semibold transition-colors hover:border-dt-primary hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30" style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-muted);" @click="controller.setQuickReminder(option.preset)">{{ option.label }}</button>
          </div>
          <div v-if="reminders.reminder1" class="flex items-center justify-between gap-3 rounded-dt-sm border px-3 py-2.5 text-sm" style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-muted);">
            <span>{{ reminderLabel }}</span>
            <button type="button" class="min-h-9 cursor-pointer rounded-dt-sm px-2 text-xs font-semibold hover:text-dt-danger focus:outline-none focus:ring-2 focus:ring-dt-danger/30" @click="controller.clearReminder({ key: 'reminder1' })">{{ t('quickDiary.reminders.cleared') }}</button>
          </div>
          <button type="button" class="flex min-h-11 w-full cursor-pointer items-center justify-between rounded-dt-sm border px-3 text-sm font-semibold transition-colors hover:border-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30" style="border-color: var(--color-border); color: var(--color-text-muted);" @click="showCustomReminder = !showCustomReminder">{{ t('quickDiary.editor.customReminder') }}<Icon name="heroicons:chevron-down" class="h-4 w-4" :class="showCustomReminder ? 'rotate-180' : ''" /></button>
          <QuickReminder v-if="showCustomReminder" :reminders="reminders" @set="controller.setReminder($event)" @clear="controller.clearReminder($event)" />
        </div>

        <div v-else class="space-y-5">
          <div class="space-y-2">
            <label class="block text-sm font-semibold" style="color: var(--color-text);" for="quick-note-title-mobile">{{ t('quickDiary.editor.titlePlaceholder') }}</label>
            <input id="quick-note-title-mobile" :value="title" type="text" class="min-h-12 w-full rounded-dt-sm border px-4 text-base outline-none placeholder:text-dt-text-soft focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20" style="border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text);" :placeholder="t('quickDiary.editor.titlePlaceholder')" :aria-label="t('quickDiary.editor.titleAria')" @input="handleTitleInput" />
          </div>
          <CompanySymbolInput
            input-id="quick-note-company-symbols-mobile"
            :model-value="stockSymbols"
            @update:model-value="controller.setStockSymbols($event)"
          />
          <button type="button" class="flex min-h-12 w-full cursor-pointer items-center justify-between rounded-dt-sm border px-4 text-sm font-semibold transition-colors hover:border-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30" style="border-color: var(--color-border); color: var(--color-text-muted);" @click="openTemplateFromMoreOptions">{{ t('quickDiary.editor.openTemplatePicker') }}<Icon name="heroicons:chevron-right" class="h-4 w-4" /></button>
          <button type="button" class="min-h-11 w-full cursor-pointer rounded-dt-sm bg-dt-primary px-4 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-dt-primary/40" @click="closePicker">{{ t('common.save') }}</button>
        </div>
      </section>
    </div>

    <div v-if="templatePickerVisible" :id="templatePickerId" class="fixed inset-0 z-[65]">
      <div class="absolute inset-0 bg-black/45" @click="setTemplatePickerOpen(false)" />
      <section class="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-dt-lg border p-5 shadow-dt-lg sm:p-6 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[min(720px,calc(100vw-48px))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-dt-md" style="border-color: var(--color-border); background: var(--color-surface); padding-bottom: max(1.25rem, env(safe-area-inset-bottom));" role="dialog" aria-modal="true" :aria-label="t('quickDiary.editor.openTemplatePicker')">
        <div class="mb-5 flex items-center justify-between gap-4">
          <div><h2 class="text-lg font-semibold" style="color: var(--color-text);">{{ t('quickDiary.editor.quickTemplates') }}</h2><p class="mt-1 text-sm" style="color: var(--color-text-muted);">{{ t('quickDiary.modal.templateSubcopy') }}</p></div>
          <button type="button" class="flex h-11 w-11 cursor-pointer items-center justify-center rounded-dt-sm hover:bg-dt-surface-muted focus:outline-none focus:ring-2 focus:ring-dt-primary/30" style="color: var(--color-text-soft);" :aria-label="t('quickDiary.editor.closePicker')" @click="setTemplatePickerOpen(false)"><Icon name="heroicons:x-mark" class="h-5 w-5" /></button>
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <button v-for="option in templateOptions" :key="option.kind" type="button" class="flex min-h-14 cursor-pointer items-center gap-3 rounded-dt-sm border px-3 text-left transition-colors hover:border-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30" :style="templateKind === option.kind ? 'border-color: var(--color-primary); background: var(--color-surface-muted); color: var(--color-primary);' : 'border-color: var(--color-border); background: var(--color-surface-muted); color: var(--color-text-muted);'" :aria-pressed="templateKind === option.kind" @click="selectTemplateKind(option.kind)">
            <Icon name="heroicons:document-text" class="h-5 w-5 shrink-0" /><span class="min-w-0"><span class="block truncate text-sm font-semibold">{{ option.label }}</span><span v-if="option.description" class="mt-0.5 block truncate text-xs" style="color: var(--color-text-soft);">{{ option.description }}</span></span>
          </button>
        </div>
        <div v-if="templates.length" class="mt-5 space-y-2 border-t pt-5" style="border-color: var(--color-border);">
          <div class="flex items-center justify-between gap-3"><p class="text-xs font-semibold uppercase tracking-[0.12em]" style="color: var(--color-text-soft);">{{ t('quickDiary.editor.quickTemplates') }}</p><button type="button" class="min-h-10 cursor-pointer rounded-dt-sm px-2 text-xs font-semibold hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30" style="color: var(--color-text-muted);" @click="openTemplateManager">{{ t('quickDiary.editor.manageTemplates') }}</button></div>
          <div class="grid gap-1.5 sm:grid-cols-2"><button v-for="template in templates" :key="`picker-${template.id}`" type="button" class="flex min-h-11 cursor-pointer items-center gap-2 rounded-dt-sm px-2.5 text-left text-sm hover:bg-dt-surface-muted hover:text-dt-primary focus:outline-none focus:ring-2 focus:ring-dt-primary/30" style="color: var(--color-text-muted);" @click="applyQuickTemplate(template.content)"><Icon name="heroicons:document-text" class="h-4 w-4 shrink-0" /><span class="truncate">{{ template.name }}</span></button></div>
        </div>
          <div v-if="templateKind !== 'blank'" class="mt-5 border-t pt-5" style="border-color: var(--color-border);"><QuickNoteTemplateAssistant :template-kind="templateKind" :template-data="templateData" :has-template-changes-pending="hasTemplateChangesPending" @update:template-data="controller.updateTemplateData($event)" @apply-template-changes="controller.applyTemplateChanges()" @regenerate-template="controller.regenerateFromTemplate()" /></div>
      </section>
    </div>

    <TemplateManager v-model="showTemplateManager" @apply="controller.applyTemplate($event)" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, unref, watch } from 'vue'
import QuickTags from '~/components/QuickTags.vue'
import VoiceInput from '~/components/VoiceInput.vue'
import TemplateManager from '~/components/TemplateManager.vue'
import QuickReminder from '~/components/QuickReminder.vue'
import QuickNoteTemplateAssistant from '~/components/quicknote/QuickNoteTemplateAssistant.vue'
import CompanySymbolInput from '~/components/stocks/CompanySymbolInput.vue'
import { createQuickReminderOptions } from '~/lib/quicknote/quick-reminders'
import type { QuickNoteEditorController } from '~/lib/quicknote/editor-controller'
import type { QuickNoteSaveMode } from '~/types/quicknote'

type PickerKind = 'tags' | 'reminder' | 'date' | 'saveMode' | 'more'

const props = withDefaults(defineProps<{
  controller: QuickNoteEditorController
  saving: boolean
  saveLabel?: string
  savingLabel?: string
  autofocus?: boolean
  scrollable?: boolean
}>(), {
  autofocus: false,
  scrollable: false,
})

const { t } = useI18n()
const { getTodayDateString } = useTimezone()
const controller = props.controller
const contentInput = ref<HTMLTextAreaElement | null>(null)
const pickerPanel = ref<HTMLElement | null>(null)
const activePicker = ref<PickerKind | null>(null)
const pickerTrigger = ref<HTMLElement | null>(null)
const showCustomReminder = ref(false)
const showTemplateManager = ref(false)
const templatePickerId = 'quick-note-template-picker'

const title = computed(() => controller.state.title)
const content = computed(() => controller.state.content)
const tags = computed(() => controller.state.tags)
const stockSymbols = computed(() => controller.state.stockSymbols)
const date = computed(() => controller.state.date)
const saveMode = computed(() => controller.state.saveMode)
const draftHint = computed(() => unref(controller.draftHint))
const draftStatus = computed(() => unref(controller.draftStatus))
const templates = computed(() => unref(controller.templates))
const reminders = computed(() => unref(controller.reminders) ?? { reminder1: null })
const existingDiaryForDate = computed(() => unref(controller.existingDiaryForDate))
const checkingExistingDiaryForDate = computed(() => unref(controller.checkingExistingDiaryForDate))
const templateKind = computed(() => controller.state.templateKind)
const templateData = computed(() => controller.state.templateData)
const hasTemplateChangesPending = computed(() => unref(controller.hasTemplateChangesPending))
const scrollable = computed(() => props.scrollable)
const templatePickerVisible = computed(() => controller.templatePickerOpen.value)
const saveModeOptions = computed<Array<{ value: QuickNoteSaveMode; label: string; description: string }>>(() => [
  { value: 'append', label: t('quickDiary.saveModes.append.label'), description: t('quickDiary.saveModes.append.description') },
  { value: 'create', label: t('quickDiary.saveModes.create.label'), description: t('quickDiary.saveModes.create.description') },
])
const availableSaveModeOptions = computed(() => saveModeOptions.value.filter(option => existingDiaryForDate.value ? option.value === 'append' : option.value === 'create'))
const templateOptions = computed(() => unref(controller.templateOptions))
const quickReminderOptions = computed(() => createQuickReminderOptions(t))
const dateLabel = computed(() => date.value === getTodayDateString() ? t('quickDiary.editor.today') : date.value)
const reminderLabel = computed(() => {
  const value = reminders.value.reminder1
  if (!value) return t('quickDiary.editor.unset')
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString() : t('quickDiary.editor.unset')
})
const selectedTagSummary = computed(() => tags.value.length ? tags.value.map(tag => `#${tag}`).join(' · ') : t('quickDiary.editor.unset'))
const saveDestinationLabel = computed(() => {
  if (checkingExistingDiaryForDate.value) return t('quickDiary.capture.checking')
  return saveMode.value === 'append' ? t('quickDiary.saveModes.append.label') : t('quickDiary.saveModes.create.label')
})
const mobileRows = computed<Array<{ kind: PickerKind; icon: string; label: string; value: string; ariaLabel: string }>>(() => [
  { kind: 'date', icon: 'heroicons:calendar-days', label: t('quickDiary.date'), value: dateLabel.value, ariaLabel: t('quickDiary.editor.openDatePicker') },
  { kind: 'saveMode', icon: 'heroicons:folder', label: t('quickDiary.editor.saveTo'), value: saveDestinationLabel.value, ariaLabel: t('quickDiary.editor.saveModeLabel') },
  { kind: 'reminder', icon: 'heroicons:bell', label: t('quickDiary.reminders.label'), value: reminderLabel.value, ariaLabel: t('quickDiary.editor.openReminderPicker') },
  { kind: 'tags', icon: 'heroicons:tag', label: t('quickDiary.tools.tags'), value: selectedTagSummary.value, ariaLabel: t('quickDiary.editor.openTagPicker') },
  { kind: 'more', icon: 'heroicons:ellipsis-horizontal', label: t('quickDiary.editor.moreOptions'), value: titleSummary.value, ariaLabel: t('quickDiary.editor.moreOptions') },
])
const titleSummary = computed(() => title.value.trim() || t('quickDiary.editor.optional'))
const pickerTitle = computed(() => {
  if (activePicker.value === 'tags') return t('quickDiary.editor.tagPickerTitle')
  if (activePicker.value === 'reminder') return t('quickDiary.editor.reminderPickerTitle')
  if (activePicker.value === 'saveMode') return t('quickDiary.editor.saveModeLabel')
  if (activePicker.value === 'more') return t('quickDiary.editor.moreOptions')
  return t('quickDiary.editor.datePickerTitle')
})

function handleContentInput(event: Event) { controller.setContent((event.target as HTMLTextAreaElement).value) }
function handleTitleInput(event: Event) { controller.setTitle((event.target as HTMLInputElement).value) }
function handleDateInput(event: Event) { controller.setDate((event.target as HTMLInputElement).value) }

function openPicker(kind: PickerKind, event?: Event) {
  pickerTrigger.value = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
  activePicker.value = kind
  nextTick(() => pickerPanel.value?.querySelector<HTMLElement>('button, input, textarea, select')?.focus())
}

function closePicker() {
  activePicker.value = null
  nextTick(() => pickerTrigger.value?.focus())
}

function selectSaveMode(mode: QuickNoteSaveMode) {
  controller.setSaveMode(mode)
  closePicker()
}

function closeTransientPanel() {
  if (activePicker.value) return closePicker()
  if (templatePickerVisible.value) setTemplatePickerOpen(false)
}

function setTemplatePickerOpen(value: boolean) {
  controller.setTemplatePickerOpen(value)
}

function openTemplateFromMoreOptions() {
  activePicker.value = null
  setTemplatePickerOpen(true)
}

function selectTemplateKind(kind: typeof controller.state.templateKind) { controller.selectTemplateKind(kind) }
function applyQuickTemplate(content: string) {
  if (!content) return
  controller.applyTemplate(content)
  setTemplatePickerOpen(false)
}
function openTemplateManager() { showTemplateManager.value = true }

function handlePickerKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closePicker()
    return
  }
  if (event.key !== 'Tab' || !pickerPanel.value) return
  const focusable = Array.from(pickerPanel.value.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])'))
  if (!focusable.length) return
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}

function focusContent() {
  if (!props.autofocus || content.value.trim() || !contentInput.value) return
  contentInput.value.focus()
}

watch(() => props.autofocus, () => nextTick(focusContent), { immediate: true })
onMounted(() => nextTick(focusContent))
</script>
