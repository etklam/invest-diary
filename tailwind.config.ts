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
      backgroundImage: {
        'gradient-purple-top': 'linear-gradient(180deg, #a855f7 0%, #7c3aed 100%)'
      }
    }
  },
  plugins: []
}
