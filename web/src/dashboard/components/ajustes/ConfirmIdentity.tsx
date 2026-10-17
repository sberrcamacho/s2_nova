import { GoogleSignInButton } from '@/auth/GoogleSignInButton'
import { AjField } from '@/dashboard/components/ajustes/AjustesUi'
import { fill } from '@/lib/inicio'
import { useTranslation } from '@/state/useTranslation'

// Zona de riesgo's identity check: the current password, or — for an
// account created with Google, which has none — signing in with Google
// again. The backend checks that the Google account is this one.
export function ConfirmIdentity({
  hasPassword,
  email,
  password,
  onPassword,
  googleToken,
  onGoogleToken,
}: {
  hasPassword: boolean
  email: string
  password: string
  onPassword: (value: string) => void
  googleToken: string | null
  onGoogleToken: (token: string | null) => void
}) {
  const { t } = useTranslation()

  if (hasPassword) {
    return <AjField label={t('aj.del.password')} type="password" autoComplete="current-password" value={password} onChange={(e) => onPassword(e.target.value)} placeholder="••••••••" />
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-overline font-semibold text-ink-secondary">{t('aj.del.googleLabel')}</span>
      {googleToken ? (
        <div role="status" className="flex min-h-11 items-center gap-2.5 rounded-[8px] border border-border-input bg-surface-sunken px-3.5 text-body-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none text-positive">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="min-w-0 flex-1 truncate">{fill(t('aj.del.googleDone'), email)}</span>
          <button type="button" onClick={() => onGoogleToken(null)} className="h-8 flex-none cursor-pointer whitespace-nowrap rounded-[8px] px-2 text-body-sm font-semibold text-v2-accent2 hover:bg-surface">
            {t('aj.del.googleAgain')}
          </button>
        </div>
      ) : (
        <GoogleSignInButton onToken={onGoogleToken} label={t('aj.del.googleConfirm')} loginHint={email} />
      )}
    </div>
  )
}
