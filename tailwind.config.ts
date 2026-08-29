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
        // Design-token bridge — maps CSS vars to Tailwind utilities.
        // Wrapped in color-mix so /alpha modifiers (bg-dt-primary/10) compile:
        // Tailwind 3.x can't apply opacity to bare var() colors.
        ...Object.fromEntries(
          [
            'primary',
            'primary-active',
            'primary-solid',
            'primary-solid-active',
            'secondary',
            'secondary-active',
            'accent',
            'success',
            'success-strong',
            'danger',
            'danger-strong',
            'warning',
            'warning-strong',
            'info',
            'background',
            'surface',
            'surface-strong',
            'surface-muted',
            'border',
            'border-strong',
            'text',
            'text-muted',
            'text-soft',
            'on-ink',
          ].map((name) => [
            `dt-${name}`,
            `color-mix(in srgb, var(--color-${name}) calc(<alpha-value> * 100%), transparent)`,
          ]),
        ),
        // legacy alias: pre-existing bg-dt-bg usages map to --color-background
        'dt-bg': 'color-mix(in srgb, var(--color-background) calc(<alpha-value> * 100%), transparent)',
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
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
}
