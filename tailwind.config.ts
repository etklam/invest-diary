import type { Config } from 'tailwindcss'

export default <Config>{
  content: [
    './components/**/*.{vue,js,ts,jsx,tsx}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.ts',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ---- 色彩 ----
      colors: {
        // 背景
        surface: {
          DEFAULT: 'var(--bg-main)',
          alt: 'var(--bg-surface)',
          raised: 'var(--bg-elevated)',
          success: 'var(--bg-success)',
          warning: 'var(--bg-warning)',
          error: 'var(--bg-error)',
          info: 'var(--bg-info)',
        },
        // 文字
        copy: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        // 邊框
        line: {
          DEFAULT: 'var(--line-default)',
          hover: 'var(--line-hover)',
          focus: 'var(--line-focus)',
        },
        // 強調色
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
        },
        // 語意色（僅用於 border/text，背景用 surface-*）
        semantic: {
          success: 'var(--semantic-success)',
          warning: 'var(--semantic-warning)',
          error: 'var(--semantic-error)',
          info: 'var(--semantic-info)',
        },
      },

      // ---- 圓角 ----
      borderRadius: {
        DEFAULT: '0px',
        sm: '2px',
        md: '6px',
        lg: '8px',
      },

      // ---- 最大寬度 ----
      maxWidth: {
        content: '1200px',
      },

      // ---- Z-Index ----
      zIndex: {
        dropdown: '10',
        sticky: '20',
        overlay: '30',
        modal: '40',
        toast: '50',
        tooltip: '60',
      },

      // ---- 過渡 ----
      transitionDuration: {
        fast: '150ms',
        standard: '250ms',
      },

      // ---- 標準過渡 ----
      transitionTimingFunction: {
        standard: 'ease-in-out',
      },

      // ---- 字體 ----
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Noto Sans TC"', '"PingFang TC"', '"Microsoft JhengHei"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', '"Cascadia Code"', '"Consolas"', 'monospace'],
      },
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
}
