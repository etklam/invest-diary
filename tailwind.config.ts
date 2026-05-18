import type { Config } from 'tailwindcss'

export default <Config>{
  content: [
    './components/**/*.{vue,js,ts,jsx,tsx}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design-token bridge — maps CSS vars to Tailwind utilities
        'dt-primary': 'var(--color-primary)',
        'dt-primary-active': 'var(--color-primary-active)',
        'dt-secondary': 'var(--color-secondary)',
        'dt-secondary-active': 'var(--color-secondary-active)',
        'dt-accent': 'var(--color-accent)',
        'dt-success': 'var(--color-success)',
        'dt-danger': 'var(--color-danger)',
        'dt-warning': 'var(--color-warning)',
        'dt-info': 'var(--color-info)',
        'dt-bg': 'var(--color-background)',
        'dt-surface': 'var(--color-surface)',
        'dt-surface-strong': 'var(--color-surface-strong)',
        'dt-surface-muted': 'var(--color-surface-muted)',
        'dt-border': 'var(--color-border)',
        'dt-border-strong': 'var(--color-border-strong)',
        'dt-text': 'var(--color-text)',
        'dt-text-muted': 'var(--color-text-muted)',
        'dt-text-soft': 'var(--color-text-soft)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        data: ['var(--font-data)'],
      },
      borderRadius: {
        'dt-sm': 'var(--radius-sm)',
        'dt-md': 'var(--radius-md)',
        'dt-lg': 'var(--radius-lg)',
        'dt-pill': 'var(--radius-pill)',
      },
      boxShadow: {
        'dt-sm': 'var(--shadow-sm)',
        'dt-md': 'var(--shadow-md)',
        'dt-lg': 'var(--shadow-lg)',
      },
      backgroundImage: {
        'gradient-purple-top': 'linear-gradient(180deg, #a855f7 0%, #7c3aed 100%)',
        'gradient-accent': 'linear-gradient(135deg, var(--color-primary), var(--color-info))'
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
}
