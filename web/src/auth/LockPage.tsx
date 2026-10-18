import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LogoMark } from '@/components/ui/Logo'
import { BrandPanel } from '@/auth/LoginPage'
import { GoogleSignInButton } from '@/auth/GoogleSignInButton'
import { useAuth } from '@/state/AuthContext'
import { useTranslation } from '@/state/useTranslation'
import { fill } from '@/lib/i18n/translations'

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('') || 'S2'
  )
}

// After "Cierre automático": only the account that was signed in can come
// back — its password, or Google for an account that signs in with Google —
// and "Cerrar sesión" forgets it and goes to Login (and Crear cuenta).
export default function LockPage() {
  const { lockedAccount, isAuthenticated, unlock, forgetLockedAccount, isSubmitting, error, clearError } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const from = (location.state as { from?: string } | null)?.from ?? '/inicio'

  if (isAuthenticated) return <Navigate to={from} replace />
  if (!lockedAccount) return <Navigate to="/login" replace />
  const account = lockedAccount

  const done = (ok: boolean) => {
    if (ok) navigate(from, { replace: true })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    if (!password) {
      setPasswordError(t('auth.passwordRequired'))
      return
    }
    done(await unlock({ password }))
  }

  const signOut = () => {
    clearError()
    forgetLockedAccount()
    navigate('/login', { replace: true })
  }

  const firstName = account.name.trim().split(/\s+/)[0] ?? ''

  // Like Nequi: the brand mark on top, who is locked in the middle, and the
  // ways back in at the bottom. On a wide screen the brand panel carries the
  // mark and the column centers.
  return (
    <div className="flex min-h-dvh w-full bg-bg">
      <BrandPanel />

      <main className="flex min-w-0 flex-1 justify-center overflow-y-auto px-6 py-6 min-[900px]:items-center min-[900px]:p-[38px]">
        <div className="flex w-full max-w-[360px] flex-col justify-between gap-8 min-[900px]:justify-center">
          <LogoMark size="md" className="self-center rounded-[12px] min-[900px]:hidden" />

          <div className="flex flex-col items-center text-center">
            <div className="relative h-24 w-24">
              <div
                className="absolute inset-1 flex items-center justify-center rounded-full bg-primary text-[30px] font-semibold text-white"
                aria-hidden="true"
              >
                {initialsOf(account.name)}
              </div>
              <div className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-bg bg-accent-soft text-on-primary-soft">
                <Lock className="h-4 w-4" strokeWidth={2.1} aria-hidden="true" />
                <span className="sr-only">{t('lock.title')}</span>
              </div>
            </div>
            <h1 className="mt-5 max-w-full truncate text-[28px] font-semibold leading-[34px] tracking-[-0.03em] text-ink">
              {fill(t('lock.greeting'), firstName)}
            </h1>
            <p className="mt-1 max-w-full truncate text-body-sm" style={{ color: 'var(--color-login-text-muted)' }}>
              {account.email}
            </p>
            <p className="mt-4 max-w-[320px] text-body-sm text-ink-secondary">
              {t(account.hasPassword ? 'lock.subtitlePassword' : 'lock.subtitleGoogle')}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {account.hasPassword && (
              <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
                {/* Lets a password manager match the saved login. */}
                <input type="email" name="username" autoComplete="username" value={account.email} readOnly hidden />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="lock-password" className="text-caption font-semibold tracking-[0.06em]" style={{ color: 'var(--color-login-label)' }}>
                    {t('auth.passwordFieldLabel')}
                  </label>
                  <Input
                    id="lock-password"
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                        style={{ color: 'var(--color-login-text-muted)' }}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setPasswordError(null)
                    }}
                    error={passwordError ?? undefined}
                    autoComplete="current-password"
                    className="h-[46px] rounded-[14px] text-label"
                    style={{
                      background: 'var(--color-login-surface)',
                      color: 'var(--color-login-input-text)',
                      boxShadow: 'none',
                      letterSpacing: showPassword ? undefined : '0.22em',
                    }}
                  />
                </div>
                {error && (
                  <p role="alert" className="text-caption font-medium text-negative">
                    {error}
                  </p>
                )}
                <Button type="submit" loading={isSubmitting} fullWidth className="h-12 rounded-[12px] active:opacity-90">
                  {t('lock.unlock')}
                </Button>
              </form>
            )}

            {account.hasGoogle && (
              <>
                {account.hasPassword && (
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-caption font-semibold tracking-[0.08em]" style={{ color: 'var(--color-login-divider-label)' }}>
                      {t('lock.or')}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <GoogleSignInButton onToken={(googleIdToken) => void unlock({ googleIdToken }).then(done)} loginHint={account.email} />
                {!account.hasPassword && error && (
                  <p role="alert" className="text-caption font-medium text-negative">
                    {error}
                  </p>
                )}
              </>
            )}

            {/* "¿No eres Laura? Cerrar sesión": forget this account and go to Login. */}
            <button
              type="button"
              onClick={signOut}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-[12px] px-2 text-body-sm hover:bg-surface-sunken"
            >
              <span className="min-w-0 truncate whitespace-nowrap">
                <span style={{ color: 'var(--color-login-text-muted)' }}>{fill(t('lock.notYou'), firstName)}</span>{' '}
                <span className="font-semibold text-link">{t('lock.signOut')}</span>
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
