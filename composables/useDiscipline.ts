/**
 * Composable for showing random trading discipline quotes
 * After diary save/edit, displays a random discipline or encouragement
 */
export async function showDisciplineToast() {
  const toast = useToast()

  try {
    const result = await $fetch<{ content: string; isCustom: boolean }>('/api/discipline/random')

    if (result?.content) {
      // Show discipline with longer duration for reading
      const message = result.isCustom
        ? `💭 ${result.content}`
        : `💡 ${result.content}`

      toast.info(message, 8000) // 8 seconds for reading
    }
  } catch (error) {
    console.error('Failed to fetch random discipline:', error)
  }
}
