export default defineNuxtPlugin(() => {
  if (process.dev) {
    const originalWarn = console.warn
    console.warn = (...args: any[]) => {
      const message = String(args[0] ?? '')
      if (message.includes('Your project has pages but the <NuxtPage /> component has not been used')) {
        return
      }
      originalWarn(...args)
    }
  }
})