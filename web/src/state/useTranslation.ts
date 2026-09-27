import { useCallback, useMemo } from 'react'
import { useAuth } from '@/state/AuthContext'
import { categoryName } from '@/lib/backendCategories'
import { currentLanguage, translate, type TranslationKey } from '@/lib/i18n/translations'
import { userService } from '@/services/userService'
import type { CategoryId, LanguageCode } from '@/types'

// Reads the user's language preference (`user.preferences.language`) and
// returns a `t()` translator bound to it — components re-render with the
// right language the moment the preference changes in Settings.
export function useTranslation() {
  const { user, updateUser } = useAuth()
  const language: LanguageCode = user?.preferences.language ?? currentLanguage()

  const t = useCallback((key: TranslationKey) => translate(key, language), [language])
  // A category's name from the shared taxonomy registry: the user's own
  // name, or the built-in one in the app language (hence the dependency).
  const tCategory = useCallback((id: CategoryId) => categoryName(id), [language])
  const setLanguage = useCallback(
    (next: LanguageCode) => {
      if (!user) return
      updateUser({ preferences: { ...user.preferences, language: next } })
      void userService.updatePreferences({ language: next })
    },
    [user, updateUser],
  )

  return useMemo(
    () => ({ language, t, tCategory, setLanguage }),
    [language, t, tCategory, setLanguage],
  )
}
