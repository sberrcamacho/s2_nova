import { useCallback, useMemo } from 'react'
import { useAuth } from '@/state/AuthContext'
import {
  categoryTranslationKey,
  paymentMethodTranslationKey,
  translate,
  type TranslationKey,
} from '@/lib/i18n/translations'
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
  const tCategory = useCallback((id: CategoryId) => translate(categoryTranslationKey(id), language), [language])
  const tPaymentMethod = useCallback((id: PaymentMethod) => translate(paymentMethodTranslationKey(id), language), [language])
  const setLanguage = useCallback(
    (next: LanguageCode) => {
      if (!user) return
      updateUser({ preferences: { ...user.preferences, language: next } })
    },
    [user, updateUser],
  )

  return useMemo(
    () => ({ language, t, tCategory, tPaymentMethod, setLanguage }),
    [language, t, tCategory, tPaymentMethod, setLanguage],
  )
}
