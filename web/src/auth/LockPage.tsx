import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BrandPanel } from '@/auth/LoginPage'
import { GoogleSignInButton } from '@/auth/GoogleSignInButton'
import { useAuth } from '@/state/AuthContext'
import { useTranslation } from '@/state/useTranslation'

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

  return (
    <div className="flex min-h-screen w-full bg-bg">
      <BrandPanel />

      <div className="flex min-w-0 flex-1 items-center justify-center overflow-y-auto p-6 min-[900px]:p-[38px]">
        <div className="flex w-full max-w-[340px] flex-col gap-[18px]">
          <div className="flex items-center gap-3">
            <div className="btn-cta flex h-12 w-12 flex-none items-center justify-center rounded-full text-label font-semibold" aria-hidden="true">
              {initialsOf(account.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-title-sm font-semibold text-ink">{account.name}</div>
              <div className="truncate text-caption" style={{ color: 'var(--color-login-text-muted)' }}>
                {account.email}
              </div>
            </div>
          </div>

          <div>
            <h1 className="text-headline font-semibold tracking-[-0.025em] text-ink">{t('lock.title')}</h1>
            <p className="mt-[5px] text-caption" style={{ color: 'var(--color-login-text-muted)' }}>
              {t(account.hasPassword ? 'lock.subtitlePassword' : 'lock.subtitleGoogle')}
            </p>
          </div>

          {account.hasPassword && (
            <form onSubmit={onSubmit} className="flex flex-col gap-[18px]" noValidate>
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

          <button
            type="button"
            onClick={signOut}
            className="flex h-12 cursor-pointer items-center justify-center rounded-[12px] border border-border-input text-label font-semibold text-ink hover:bg-surface-sunken"
          >
            {t('lock.signOut')}
          </button>
          <div className="-mt-2 text-center text-caption text-v2-dim [line-height:normal]">{t('lock.signOutHint')}</div>
        </div>
      </div>
    </div>
  )
}
