<script setup lang="ts">
// Load Google Translate script
const loadGoogleTranslate = () => {
  if (process.client) {
    // Avoid duplicate loading
    if (document.getElementById('google-translate-script')) {
      return
    }

    // Add Google Translate script
    const script = document.createElement('script')
    script.id = 'google-translate-script'
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    script.async = true
    
    const head = document.querySelector('head')
    if (head) {
      head.appendChild(script)
    }

    // Define callback function
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: 'zh-TW',
          includedLanguages: 'en,zh-CN,zh-TW,ja,ko',
          layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        'google_translate_element'
      )
    }
  }
}

onMounted(() => {
  loadGoogleTranslate()
})
</script>

<template>
  <div class="google-translate-wrapper">
    <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
      <i-heroicons-language class="h-5 w-5" />
      <span>翻譯</span>
    </div>
    <div id="google_translate_element" class="mt-2"></div>
  </div>
</template>

<style>
/* Hide Google Translate banner */
.goog-te-banner-frame {
  display: none !important;
}

body {
  top: 0 !important;
}

/* Style the translate widget */
.goog-te-gadget {
  font-family: inherit !important;
}

.goog-te-gadget-simple {
  background-color: transparent !important;
  border: 1px solid rgb(209 213 219) !important;
  border-radius: 0.5rem !important;
  padding: 0.5rem 0.75rem !important;
  font-size: 0.875rem !important;
}

.dark .goog-te-gadget-simple {
  border-color: rgb(75 85 99) !important;
  background-color: rgb(31 41 55) !important;
}

.goog-te-menu-value {
  color: rgb(55 65 81) !important;
}

.dark .goog-te-menu-value {
  color: rgb(209 213 219) !important;
}

.goog-te-menu-value span {
  color: inherit !important;
}

/* Hide the Google logo in the widget */
.goog-te-gadget .goog-te-gadget-icon {
  display: none !important;
}

/* Style the dropdown */
.goog-te-menu-frame {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
  border-radius: 0.5rem !important;
}
</style>
