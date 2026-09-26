import { useCallback, useMemo } from 'react'
import { useAuth } from '@/state/AuthContext'
import { categoryName } from '@/lib/backendCategories'
import {
  paymentMethodTranslationKey,
  translate,
  type TranslationKey,
} from '@/lib/i18n/translations'
import { userService } from '@/services/userService'
import type { CategoryId, LanguageCode, PaymentMethod } from '@/types'

// Reads the user's language preference (`user.preferences.language`) and
// returns a `t()` translator bound to it — components re-render with the
// right language the moment the preference changes in Settings.
export function useTranslation() {
  const { user, updateUser } = useAuth()
  const language: LanguageCode = user?.preferences.language ?? 'es'

  const t = useCallback((key: TranslationKey) => translate(key, language), [language])
  // Convenience wrappers for the two mock-data label fields that need to
  // react to the language preference (category/payment-method names) —
  // saves every call site from importing the key-mapping helpers directly.
  // Category names come from the shared taxonomy registry (user renames
  // included) — Spanish, like the rest of the v2 copy.
  const tCategory = useCallback((id: CategoryId) => categoryName(id), [])
  const tPaymentMethod = useCallback((id: PaymentMethod) => translate(paymentMethodTranslationKey(id), language), [language])
  const setLanguage = useCallback(
    (next: LanguageCode) => {
      if (!user) return
      updateUser({ preferences: { ...user.preferences, language: next } })
      void userService.updatePreferences({ language: next })
    },
    [user, updateUser],
  )

  return useMemo(
    () => ({ language, t, tCategory, tPaymentMethod, setLanguage }),
    [language, t, tCategory, tPaymentMethod, setLanguage],
  )
}
