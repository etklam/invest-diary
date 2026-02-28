<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
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
        <div class="flex items-end justify-center min-h-screen px-4 pb-20 text-center sm:block sm:p-0">
          <!-- Glassmorphic background overlay -->
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 backdrop-blur-none"
            enter-to-class="opacity-100 backdrop-blur-sm"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 backdrop-blur-sm"
            leave-to-class="opacity-0 backdrop-blur-none"
          >
            <div
              v-if="show"
              class="fixed inset-0 bg-gradient-to-br from-gray-900/60 via-gray-800/60 to-indigo-900/40 backdrop-blur-md transition-all"
              @click="close"
            ></div>
          </Transition>

          <!-- Center the modal -->
          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 translate-y-8 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-8 scale-95"
          >
            <div
              v-if="show"
              class="relative inline-block align-bottom w-full text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle"
            >
              <!-- Mobile: Full screen -->
              <div class="sm:hidden h-screen">
                <div class="h-full backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 flex flex-col">
                  <!-- Mobile header -->
                  <div class="flex-shrink-0 px-4 py-4 flex justify-between items-center border-b border-gray-200/50 dark:border-gray-700/50">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white" id="modal-title">
                      {{ t('quickDiary.title') }}
                    </h3>
                    <button
                      @click="close"
                      :aria-label="t('common.close')"
                      class="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200 cursor-pointer"
                    >
                      <Icon name="heroicons:x-mark" class="h-5 w-5" />
                    </button>
                  </div>

                  <!-- Mobile content -->
                  <div class="flex-1 overflow-y-auto">
                    <!-- Step 1: Choose Template -->
                    <div v-if="step === 1" class="p-4 space-y-4">
                      <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('quickDiary.selectTemplate') }}</p>

                      <button
                        @click="selectTemplate('trading')"
                        class="w-full p-5 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:border-indigo-400/60 dark:hover:border-indigo-500/60 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 text-left cursor-pointer group"
                      >
                        <div class="flex items-center gap-4">
                          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                            <Icon name="heroicons:currency-dollar-solid" class="h-6 w-6 text-white" />
                          </div>
                          <div class="flex-1">
                            <h4 class="font-semibold text-gray-900 dark:text-white">{{ t('quickDiary.templates.trading') }}</h4>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('quickDiary.templates.tradingDesc') }}</p>
                          </div>
                        </div>
                      </button>

                      <button
                        @click="selectTemplate('reflection')"
                        class="w-full p-5 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:border-purple-400/60 dark:hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200 text-left cursor-pointer group"
                      >
                        <div class="flex items-center gap-4">
                          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                            <Icon name="heroicons:light-bulb-solid" class="h-6 w-6 text-white" />
                          </div>
                          <div class="flex-1">
                            <h4 class="font-semibold text-gray-900 dark:text-white">{{ t('quickDiary.templates.reflection') }}</h4>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('quickDiary.templates.reflectionDesc') }}</p>
                          </div>
                        </div>
                      </button>

                      <button
                        @click="selectTemplate('observation')"
                        class="w-full p-5 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:border-blue-400/60 dark:hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 text-left cursor-pointer group"
                      >
                        <div class="flex items-center gap-4">
                          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                            <Icon name="heroicons:eye-solid" class="h-6 w-6 text-white" />
                          </div>
                          <div class="flex-1">
                            <h4 class="font-semibold text-gray-900 dark:text-white">{{ t('quickDiary.templates.observation') }}</h4>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('quickDiary.templates.observationDesc') }}</p>
                          </div>
                        </div>
                      </button>
                    </div>

                    <!-- Step 2: Form -->
                    <div v-else-if="step === 2" class="p-4 space-y-5">
                      <!-- Date Picker -->
                      <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {{ t('quickDiary.date') }}
                        </label>
                        <input
                          v-model="selectedDate"
                          type="date"
                          :max="maxDate"
                          class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200"
                        />
                      </div>

                      <!-- Trading Template Form -->
                      <div v-if="selectedTemplate === 'trading'" class="space-y-4">
                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.trading.operation') }}
                          </label>
                          <div class="flex gap-2">
                            <button
                              v-for="type in ['buy', 'sell', 'both']"
                              :key="type"
                              @click="formData.tradingType = type"
                              :class="[
                                'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                                formData.tradingType === type
                                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                  : 'backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80'
                              ]"
                            >
                              {{ type === 'buy' ? t('quickDiary.trading.buy') : type === 'sell' ? t('quickDiary.trading.sell') : t('quickDiary.trading.both') }}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.trading.symbols') }}
                          </label>
                          <input
                            v-model="formData.symbols"
                            type="text"
                            :placeholder="t('quickDiary.trading.symbolsPlaceholder')"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.trading.marketFeeling') }}
                          </label>
                          <div class="flex gap-2">
                            <button
                              v-for="mood in ['bullish', 'bearish', 'neutral']"
                              :key="mood"
                              @click="formData.marketMood = mood"
                              :class="[
                                'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                                formData.marketMood === mood
                                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                  : 'backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80'
                              ]"
                            >
                              {{ mood === 'bullish' ? t('quickDiary.trading.bullish') : mood === 'bearish' ? t('quickDiary.trading.bearish') : t('quickDiary.trading.neutral') }}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.trading.note') }}
                          </label>
                          <textarea
                            v-model="formData.note"
                            rows="3"
                            :placeholder="t('quickDiary.trading.notePlaceholder')"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200 resize-none"
                          ></textarea>
                        </div>
                      </div>

                      <!-- Reflection Template Form -->
                      <div v-else-if="selectedTemplate === 'reflection'" class="space-y-4">
                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.reflection.marketCondition') }}
                          </label>
                          <select
                            v-model="formData.marketCondition"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200"
                          >
                            <option value="">{{ t('quickDiary.reflection.selectCondition') }}</option>
                            <optgroup :label="locale === 'zh-TW' || locale === 'zh-CN' ? '漲跌' : 'Price Change'">
                              <option value="大漲">大漲</option>
                              <option value="小漲">小漲</option>
                              <option value="盤整">盤整</option>
                              <option value="小跌">小跌</option>
                              <option value="大跌">大跌</option>
                            </optgroup>
                            <optgroup :label="locale === 'zh-TW' || locale === 'zh-CN' ? '走勢型態' : 'Trend Pattern'">
                              <option value="高開高走">高開高走</option>
                              <option value="高開低走">高開低走</option>
                              <option value="低開高走">低開高走</option>
                              <option value="低開低走">低開低走</option>
                              <option value="震盪">震盪</option>
                            </optgroup>
                            <optgroup :label="locale === 'zh-TW' || locale === 'zh-CN' ? '市場結構' : 'Market Structure'">
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
                            {{ t('quickDiary.reflection.rating') }}
                          </label>
                          <div class="flex gap-2">
                            <button
                              v-for="rating in [1, 2, 3, 4, 5]"
                              :key="rating"
                              @click="formData.rating = rating"
                              :class="[
                                'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                                formData.rating === rating
                                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                  : 'backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80'
                              ]"
                            >
                              {{ rating }}⭐
                            </button>
                          </div>
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.reflection.goodPoints') }}
                          </label>
                          <div class="mb-2">
                            <label class="flex items-center gap-2 cursor-pointer">
                              <input
                                v-model="formData.noRashTrading"
                                type="checkbox"
                                class="w-4 h-4 text-indigo-600 focus:ring-indigo-500/50 border-gray-300 rounded"
                              />
                              <span class="text-sm text-gray-700 dark:text-gray-300">{{ t('quickDiary.reflection.noRashTrading') }}</span>
                            </label>
                          </div>
                          <textarea
                            v-model="formData.goodPoints"
                            rows="2"
                            :placeholder="t('quickDiary.reflection.goodPointsPlaceholder')"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200 resize-none"
                          ></textarea>
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.reflection.improvePoints') }}
                          </label>
                          <textarea
                            v-model="formData.improvePoints"
                            rows="2"
                            :placeholder="t('quickDiary.reflection.improvePointsPlaceholder')"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200 resize-none"
                          ></textarea>
                        </div>
                      </div>

                      <!-- Observation Template Form -->
                      <div v-else-if="selectedTemplate === 'observation'" class="space-y-4">
                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.observation.topic') }}
                          </label>
                          <input
                            v-model="formData.topic"
                            type="text"
                            :placeholder="t('quickDiary.observation.topicPlaceholder')"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.observation.type') }}
                          </label>
                          <div class="flex flex-wrap gap-2">
                            <button
                              v-for="type in ['板塊熱點', '個股走勢', '市場消息', '技術分析', '其他']"
                              :key="type"
                              @click="formData.observationType = type"
                              :class="[
                                'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                                formData.observationType === type
                                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                  : 'backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80'
                              ]"
                            >
                              {{ type }}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.observation.content') }}
                          </label>
                          <textarea
                            v-model="formData.content"
                            rows="4"
                            :placeholder="t('quickDiary.observation.contentPlaceholder')"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200 resize-none"
                          ></textarea>
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.observation.action') }}
                          </label>
                          <input
                            v-model="formData.action"
                            type="text"
                            :placeholder="t('quickDiary.observation.actionPlaceholder')"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200"
                          />
                        </div>
                      </div>

                      <!-- Preview -->
                      <div class="pt-5 border-t border-gray-200/50 dark:border-gray-700/50">
                        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{{ t('quickDiary.preview') }}</h4>
                        <div class="backdrop-blur-xl bg-gray-50/80 dark:bg-gray-900/80 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                          <p class="font-medium text-gray-900 dark:text-white">{{ previewTitle }}</p>
                          <div class="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ previewContent }}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Mobile footer -->
                  <div class="flex-shrink-0 px-4 py-4 border-t border-gray-200/50 dark:border-gray-700/50 flex gap-3">
                    <button
                      v-if="step === 2"
                      @click="step = 1"
                      class="flex-1 px-4 py-3 rounded-xl border border-gray-300/60 dark:border-gray-600/60 bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50/80 dark:hover:bg-gray-700/60 transition-all duration-200 cursor-pointer"
                    >
                      {{ t('common.back') }}
                    </button>
                    <button
                      @click="close"
                      class="flex-1 px-4 py-3 rounded-xl border border-gray-300/60 dark:border-gray-600/60 bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50/80 dark:hover:bg-gray-700/60 transition-all duration-200 cursor-pointer"
                    >
                      {{ t('common.cancel') }}
                    </button>
                    <button
                      v-if="step === 2"
                      @click="createDiary"
                      :disabled="saving"
                      class="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/25 cursor-pointer"
                    >
                      <Icon v-if="saving" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline" />
                      {{ saving ? t('quickDiary.creating') : t('quickDiary.createDiary') }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Desktop: Centered modal -->
              <div class="hidden sm:block">
                <div class="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-2xl shadow-gray-900/20 border border-white/40 dark:border-white/10 overflow-hidden max-w-2xl">
                  <!-- Header -->
                  <div class="px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center">
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white" id="modal-title">
                      {{ t('quickDiary.title') }}
                    </h3>
                    <button
                      @click="close"
                      :aria-label="t('common.close')"
                      class="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200 cursor-pointer"
                    >
                      <Icon name="heroicons:x-mark" class="h-5 w-5" />
                    </button>
                  </div>

                  <!-- Content -->
                  <div class="max-h-[calc(100vh-12rem)] overflow-y-auto">
                    <!-- Step 1: Choose Template -->
                    <div v-if="step === 1" class="p-6">
                      <p class="text-sm text-gray-600 dark:text-gray-400 mb-5">{{ t('quickDiary.selectTemplate') }}</p>

                      <div class="grid grid-cols-3 gap-4">
                        <button
                          @click="selectTemplate('trading')"
                          class="p-5 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:border-indigo-400/60 dark:hover:border-indigo-500/60 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 text-left cursor-pointer group"
                        >
                          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                            <Icon name="heroicons:currency-dollar-solid" class="h-6 w-6 text-white" />
                          </div>
                          <h4 class="font-semibold text-gray-900 dark:text-white text-sm">{{ t('quickDiary.templates.trading') }}</h4>
                          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('quickDiary.templates.tradingDesc') }}</p>
                        </button>

                        <button
                          @click="selectTemplate('reflection')"
                          class="p-5 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:border-purple-400/60 dark:hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200 text-left cursor-pointer group"
                        >
                          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                            <Icon name="heroicons:light-bulb-solid" class="h-6 w-6 text-white" />
                          </div>
                          <h4 class="font-semibold text-gray-900 dark:text-white text-sm">{{ t('quickDiary.templates.reflection') }}</h4>
                          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('quickDiary.templates.reflectionDesc') }}</p>
                        </button>

                        <button
                          @click="selectTemplate('observation')"
                          class="p-5 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:border-blue-400/60 dark:hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 text-left cursor-pointer group"
                        >
                          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                            <Icon name="heroicons:eye-solid" class="h-6 w-6 text-white" />
                          </div>
                          <h4 class="font-semibold text-gray-900 dark:text-white text-sm">{{ t('quickDiary.templates.observation') }}</h4>
                          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('quickDiary.templates.observationDesc') }}</p>
                        </button>
                      </div>
                    </div>

                    <!-- Step 2: Fill Form -->
                    <div v-else-if="step === 2" class="p-6 space-y-5">
                      <!-- Date Picker -->
                      <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {{ t('quickDiary.date') }}
                        </label>
                        <input
                          v-model="selectedDate"
                          type="date"
                          :max="maxDate"
                          class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200"
                        />
                      </div>

                      <!-- Trading Template Form -->
                      <div v-if="selectedTemplate === 'trading'" class="space-y-4">
                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.trading.operation') }}
                          </label>
                          <div class="flex gap-2">
                            <button
                              v-for="type in ['buy', 'sell', 'both']"
                              :key="type"
                              @click="formData.tradingType = type"
                              :class="[
                                'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                                formData.tradingType === type
                                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                  : 'backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80'
                              ]"
                            >
                              {{ type === 'buy' ? t('quickDiary.trading.buy') : type === 'sell' ? t('quickDiary.trading.sell') : t('quickDiary.trading.both') }}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.trading.symbols') }}
                          </label>
                          <input
                            v-model="formData.symbols"
                            type="text"
                            :placeholder="t('quickDiary.trading.symbolsPlaceholder')"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.trading.marketFeeling') }}
                          </label>
                          <div class="flex gap-2">
                            <button
                              v-for="mood in ['bullish', 'bearish', 'neutral']"
                              :key="mood"
                              @click="formData.marketMood = mood"
                              :class="[
                                'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                                formData.marketMood === mood
                                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                  : 'backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80'
                              ]"
                            >
                              {{ mood === 'bullish' ? t('quickDiary.trading.bullish') : mood === 'bearish' ? t('quickDiary.trading.bearish') : t('quickDiary.trading.neutral') }}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.trading.note') }}
                          </label>
                          <textarea
                            v-model="formData.note"
                            rows="3"
                            :placeholder="t('quickDiary.trading.notePlaceholder')"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200 resize-none"
                          ></textarea>
                        </div>
                      </div>

                      <!-- Reflection Template Form -->
                      <div v-else-if="selectedTemplate === 'reflection'" class="space-y-4">
                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.reflection.marketCondition') }}
                          </label>
                          <select
                            v-model="formData.marketCondition"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200"
                          >
                            <option value="">{{ t('quickDiary.reflection.selectCondition') }}</option>
                            <optgroup :label="locale === 'zh-TW' || locale === 'zh-CN' ? '漲跌' : 'Price Change'">
                              <option value="大漲">大漲</option>
                              <option value="小漲">小漲</option>
                              <option value="盤整">盤整</option>
                              <option value="小跌">小跌</option>
                              <option value="大跌">大跌</option>
                            </optgroup>
                            <optgroup :label="locale === 'zh-TW' || locale === 'zh-CN' ? '走勢型態' : 'Trend Pattern'">
                              <option value="高開高走">高開高走</option>
                              <option value="高開低走">高開低走</option>
                              <option value="低開高走">低開高走</option>
                              <option value="低開低走">低開低走</option>
                              <option value="震盪">震盪</option>
                            </optgroup>
                            <optgroup :label="locale === 'zh-TW' || locale === 'zh-CN' ? '市場結構' : 'Market Structure'">
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
                            {{ t('quickDiary.reflection.rating') }}
                          </label>
                          <div class="flex gap-2">
                            <button
                              v-for="rating in [1, 2, 3, 4, 5]"
                              :key="rating"
                              @click="formData.rating = rating"
                              :class="[
                                'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                                formData.rating === rating
                                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                  : 'backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80'
                              ]"
                            >
                              {{ rating }}⭐
                            </button>
                          </div>
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.reflection.goodPoints') }}
                          </label>
                          <div class="mb-2">
                            <label class="flex items-center gap-2 cursor-pointer">
                              <input
                                v-model="formData.noRashTrading"
                                type="checkbox"
                                class="w-4 h-4 text-indigo-600 focus:ring-indigo-500/50 border-gray-300 rounded"
                              />
                              <span class="text-sm text-gray-700 dark:text-gray-300">{{ t('quickDiary.reflection.noRashTrading') }}</span>
                            </label>
                          </div>
                          <textarea
                            v-model="formData.goodPoints"
                            rows="2"
                            :placeholder="t('quickDiary.reflection.goodPointsPlaceholder')"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200 resize-none"
                          ></textarea>
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.reflection.improvePoints') }}
                          </label>
                          <textarea
                            v-model="formData.improvePoints"
                            rows="2"
                            :placeholder="t('quickDiary.reflection.improvePointsPlaceholder')"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200 resize-none"
                          ></textarea>
                        </div>
                      </div>

                      <!-- Observation Template Form -->
                      <div v-else-if="selectedTemplate === 'observation'" class="space-y-4">
                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.observation.topic') }}
                          </label>
                          <input
                            v-model="formData.topic"
                            type="text"
                            :placeholder="t('quickDiary.observation.topicPlaceholder')"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.observation.type') }}
                          </label>
                          <div class="flex flex-wrap gap-2">
                            <button
                              v-for="type in ['板塊熱點', '個股走勢', '市場消息', '技術分析', '其他']"
                              :key="type"
                              @click="formData.observationType = type"
                              :class="[
                                'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                                formData.observationType === type
                                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                  : 'backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80'
                              ]"
                            >
                              {{ type }}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.observation.content') }}
                          </label>
                          <textarea
                            v-model="formData.content"
                            rows="4"
                            :placeholder="t('quickDiary.observation.contentPlaceholder')"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200 resize-none"
                          ></textarea>
                        </div>

                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {{ t('quickDiary.observation.action') }}
                          </label>
                          <input
                            v-model="formData.action"
                            type="text"
                            :placeholder="t('quickDiary.observation.actionPlaceholder')"
                            class="w-full px-4 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-gray-300/60 dark:border-gray-600/60 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all duration-200"
                          />
                        </div>
                      </div>

                      <!-- Preview -->
                      <div class="pt-5 border-t border-gray-200/50 dark:border-gray-700/50">
                        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{{ t('quickDiary.preview') }}</h4>
                        <div class="backdrop-blur-xl bg-gray-50/80 dark:bg-gray-900/80 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                          <p class="font-medium text-gray-900 dark:text-white">{{ previewTitle }}</p>
                          <div class="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ previewContent }}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div class="px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-end gap-3">
                    <button
                      v-if="step === 2"
                      @click="step = 1"
                      class="px-5 py-2.5 rounded-xl border border-gray-300/60 dark:border-gray-600/60 bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50/80 dark:hover:bg-gray-700/60 transition-all duration-200 cursor-pointer"
                    >
                      {{ t('common.back') }}
                    </button>
                    <button
                      @click="close"
                      class="px-5 py-2.5 rounded-xl border border-gray-300/60 dark:border-gray-600/60 bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50/80 dark:hover:bg-gray-700/60 transition-all duration-200 cursor-pointer"
                    >
                      {{ t('common.cancel') }}
                    </button>
                    <button
                      v-if="step === 2"
                      @click="createDiary"
                      :disabled="saving"
                      class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/25 cursor-pointer"
                    >
                      <Icon v-if="saving" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline" />
                      {{ saving ? t('quickDiary.creating') : t('quickDiary.createDiary') }}
                    </button>
                  </div>
                </div>
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

const { t, locale } = useI18n()
const { getTodayDateString } = useTimezone()
const step = ref(1)
const selectedTemplate = ref<'trading' | 'reflection' | 'observation' | null>(null)
const saving = ref(false)

// Initialize with today's date in YYYY-MM-DD format (user's timezone)
const todayStr = getTodayDateString()

const selectedDate = ref(todayStr)
const maxDate = ref(todayStr) // Don't allow future dates

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

// Format date for display (e.g., 2024/01/15)
const formattedDate = computed(() => {
  if (!selectedDate.value) return todayStr
  return selectedDate.value.replace(/-/g, '/')
})

// Preview computed
const previewTitle = computed(() => {
  if (selectedTemplate.value === 'trading') {
    const typeText = formData.tradingType === 'buy' ? t('quickDiary.trading.buy') : formData.tradingType === 'sell' ? t('quickDiary.trading.sell') : t('quickDiary.trading.both')
    const symbols = formData.symbols ? ` - ${formData.symbols}` : ''
    return `${formattedDate.value} ${typeText}${t('diary.title')}${symbols}`
  } else if (selectedTemplate.value === 'reflection') {
    return `${formattedDate.value} ${t('quickDiary.templates.reflection')}`
  } else if (selectedTemplate.value === 'observation') {
    return formData.topic || `${formattedDate.value} ${t('quickDiary.templates.observation')}`
  }
  return ''
})

const previewContent = computed(() => {
  if (selectedTemplate.value === 'trading') {
    let content = `## ${t('quickDiary.trading.operation')}\n\n`
    content += `- ${t('common.operation')}: ${formData.tradingType === 'buy' ? t('quickDiary.trading.buy') : formData.tradingType === 'sell' ? t('quickDiary.trading.sell') : t('quickDiary.trading.both')}\n`
    if (formData.symbols) {
      content += `- ${locale.value === 'en' ? 'Symbols' : '標的'}：${formData.symbols}\n`
    }
    content += `- ${t('quickDiary.trading.marketFeeling')}：${formData.marketMood === 'bullish' ? t('quickDiary.trading.bullish') : formData.marketMood === 'bearish' ? t('quickDiary.trading.bearish') : t('quickDiary.trading.neutral')}\n`
    if (formData.note) {
      content += `\n## ${t('quickDiary.trading.note')}\n\n${formData.note}\n`
    }
    return content
  } else if (selectedTemplate.value === 'reflection') {
    let content = `## ${t('quickDiary.reflection.marketCondition')}\n\n${formData.marketCondition || '-'}\n\n`
    content += `## ${t('quickDiary.reflection.rating')}\n\n${'⭐'.repeat(formData.rating)}${formData.rating > 0 ? ` (${formData.rating}/5)` : ''}\n\n`
    const goodPointsItems: string[] = []
    if (formData.noRashTrading) {
      goodPointsItems.push(`- ${t('quickDiary.reflection.noRashTrading')}`)
    }
    if (formData.goodPoints) {
      goodPointsItems.push(formData.goodPoints)
    }
    if (goodPointsItems.length > 0) {
      content += `## ${t('quickDiary.reflection.goodPoints')}\n\n${goodPointsItems.join('\n')}\n\n`
    }
    if (formData.improvePoints) {
      content += `## ${t('quickDiary.reflection.improvePoints')}\n\n${formData.improvePoints}\n`
    }
    return content
  } else if (selectedTemplate.value === 'observation') {
    let content = `## ${locale.value === 'en' ? 'Topic' : '觀察主題'}：${formData.topic || '-'}\n\n`
    content += `**${t('quickDiary.observation.type')}：** ${formData.observationType || '-'}\n\n`
    if (formData.content) {
      content += `## ${t('quickDiary.observation.content')}\n\n${formData.content}\n\n`
    }
    if (formData.action) {
      content += `## ${locale.value === 'en' ? 'Follow-up Action' : '後續行動'}\n\n${formData.action}\n`
    }
    return content
  }
  return ''
})

const close = () => {
  step.value = 1
  selectedTemplate.value = null
  selectedDate.value = todayStr
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
    toast.error(t('quickDiary.fillRequired'))
    return
  }

  saving.value = true
  try {
    const diary = await $fetch<{ id: { toString: () => string } }>('/api/diaries', {
      method: 'POST',
      body: {
        title: previewTitle.value,
        content: previewContent.value,
        date: `${selectedDate.value}T12:00:00.000Z`,
        appendToToday: true
      }
    })

    toast.success(t('quickDiary.success'))
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
