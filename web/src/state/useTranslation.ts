import { useCallback, useMemo } from 'react'
import { useAuth } from '@/state/AuthContext'
import { translate, type TranslationKey } from '@/lib/i18n/translations'
import type { LanguageCode } from '@/types'

// Reads the user's language preference (`user.preferences.language`) and
// returns a `t()` translator bound to it — components re-render with the
// right language the moment the preference changes in Settings.
export function useTranslation() {
  const { user, updateUser } = useAuth()
  const language: LanguageCode = user?.preferences.language ?? 'es'

  const t = useCallback((key: TranslationKey) => translate(key, language), [language])
  const setLanguage = useCallback(
    (next: LanguageCode) => {
      if (!user) return
      updateUser({ preferences: { ...user.preferences, language: next } })
    },
    [user, updateUser],
  )

  return useMemo(() => ({ language, t, setLanguage }), [language, t, setLanguage])
}
