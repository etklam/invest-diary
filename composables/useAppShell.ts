import type { QuickDiaryContext } from '~/types/quicknote'

export const useAppShell = () => {
  const showQuickDiary = useState<boolean>('app-shell:quick-diary-open', () => false)
  const quickDiaryContext = useState<QuickDiaryContext | null>('app-shell:quick-diary-context', () => null)
  const showMobileNavigation = useState<boolean>('app-shell:mobile-navigation-open', () => false)

  const openQuickDiary = (context: QuickDiaryContext = { source: 'floating' }) => {
    quickDiaryContext.value = context
    showQuickDiary.value = true
  }

  const closeQuickDiary = () => {
    showQuickDiary.value = false
    quickDiaryContext.value = null
  }

  const openMobileNavigation = () => {
    showMobileNavigation.value = true
  }

  const closeMobileNavigation = () => {
    showMobileNavigation.value = false
  }

  return {
    showQuickDiary,
    quickDiaryContext,
    showMobileNavigation,
    openQuickDiary,
    closeQuickDiary,
    openMobileNavigation,
    closeMobileNavigation,
  }
}
