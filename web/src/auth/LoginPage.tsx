import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { GoogleSignInButton } from '@/auth/GoogleSignInButton'
import { useAuth } from '@/state/AuthContext'
import { useTranslation } from '@/state/useTranslation'
import { cn } from '@/lib/cn'

// Always dark in both themes: the dark hero's deep violet with the dark
// mark's violet → blue glow (DESIGN-SYSTEM.md §2.2 hero-bg, dark).
const BRAND_PANEL_GRADIENT =
  'radial-gradient(120% 90% at 100% 0%, rgba(168,15,250,.35) 0%, rgba(0,71,245,.22) 45%, rgba(0,196,251,0) 80%), #1a0b3d'

function BrandPanel() {
  const { t } = useTranslation()
  return (
    <div
      className="relative hidden w-[452px] shrink-0 flex-col justify-between overflow-hidden p-[38px] text-white min-[900px]:flex"
      style={{ background: BRAND_PANEL_GRADIENT }}
    >
      <div
        className="pointer-events-none absolute -right-[60px] -top-20 h-[260px] w-[260px] rounded-full"
        style={{ background: 'rgba(168,15,250,.3)', filter: 'blur(60px)' }}
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-2.5">
        <Logo variant="mark" tone="inverted" size="sm" />
        <div>
          <div className="text-[15px] font-extrabold tracking-[-0.01em]">S2 Nova</div>
          <div className="whitespace-nowrap text-caption font-semibold tracking-[.04em] text-white/70">PERSONAL FINANCE</div>
        </div>
      </div>

      <div className="relative flex flex-col gap-[22px]">
        <div className="text-[34px] font-extrabold leading-[1.14] tracking-[-0.03em] text-pretty">
          {t('auth.hero.login1')}
          <br />
          {t('auth.hero.login2')}
        </div>

        <div className="flex flex-col gap-[18px]">
          <svg viewBox="0 0 376 132" width="100%" height="132" className="block overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id="loginAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d485fb" stopOpacity=".55" />
                <stop offset="100%" stopColor="#d485fb" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1="33" x2="376" y2="33" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
            <line x1="0" y1="76" x2="376" y2="76" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
            <line x1="0" y1="119" x2="376" y2="119" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
            <path
              d="M0 104 C 34 96, 46 68, 78 66 S 130 88, 156 74 S 208 34, 235 40 S 292 30, 313 20 S 358 14, 376 8 L 376 132 L 0 132 Z"
              fill="url(#loginAreaGradient)"
            />
            <path
              d="M0 104 C 34 96, 46 68, 78 66 S 130 88, 156 74 S 208 34, 235 40 S 292 30, 313 20 S 358 14, 376 8"
              fill="none"
              stroke="#d485fb"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M0 122 C 40 118, 62 112, 96 110 S 152 106, 188 100 S 250 96, 292 86 S 350 82, 376 76"
              fill="none"
              stroke="rgba(255,255,255,.28)"
              strokeWidth="2"
              strokeDasharray="5 6"
              strokeLinecap="round"
            />
            <circle cx="376" cy="8" r="5" fill="#050507" stroke="#d485fb" strokeWidth="2.5" />
          </svg>

          <div className="flex items-center gap-[18px]">
            <svg width="66" height="66" viewBox="0 0 66 66" className="shrink-0 -rotate-90" aria-hidden="true">
              <circle cx="33" cy="33" r="27" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="8" />
              <circle
                cx="33"
                cy="33"
                r="27"
                fill="none"
                stroke="#d485fb"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="98 172"
              />
              <circle
                cx="33"
                cy="33"
                r="27"
                fill="none"
                stroke="#7cf0bb"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="42 172"
                strokeDashoffset="-104"
              />
            </svg>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#d485fb]" />
                <span className="text-[12.5px] text-white/72">{t('auth.hero.byCategory')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#7cf0bb]" />
                <span className="text-[12.5px] text-white/72">{t('auth.hero.saving')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-white/22" />
                <span className="text-[12.5px] text-white/72">{t('auth.hero.projection')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative text-caption text-white/45">{t('auth.encryptedData')}</div>
    </div>
  )
}

function RememberMeCheckbox({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px]"
        style={{
          background: checked ? 'var(--color-login-primary)' : 'transparent',
          border: checked ? 'none' : '1.5px solid var(--color-border-input)',
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.3l2.2 2.2 4.8-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-xs" style={{ color: 'var(--color-login-checkbox-text)' }}>
        {t('auth.rememberMe')}
      </span>
    </label>
  )
}

// The mockup's "enter" glyph (IC.enter).
function EnterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-v2-muted" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4 M10 17l5-5-5-5 M15 12H3" />
    </svg>
  )
}

export default function LoginPage() {
  const { user, login, loginWithGoogle, enterGuest, logout, error, clearError, isSubmitting } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  // Bumped on every failed attempt so the form can be re-keyed — remounting
  // it is what replays the `animate-shake` CSS animation, since re-applying
  // the same class name a second time is a no-op.
  const [shakeKey, setShakeKey] = useState(0)

  // Arriving here ends a guest session (nothing is kept). On mount only, so
  // "Continuar como invitado" on this same page isn't undone.
  useEffect(() => {
    if (user?.isGuest) logout()
  }, [])

  const onGuest = async () => {
    clearError()
    await enterGuest()
    navigate('/inicio', { replace: true })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    const nextEmailError = isEmailValid ? null : t('auth.invalidEmail')
    const nextPasswordError = password.length >= 8 ? null : t('auth.passwordTooShort')
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    if (nextEmailError || nextPasswordError) {
      setShakeKey((k) => k + 1)
      return
    }

    if (await login({ email, password })) {
      navigate('/inicio', { replace: true })
    } else {
      setShakeKey((k) => k + 1)
    }
  }

  const onGoogleToken = async (idToken: string) => {
    clearError()
    if (await loginWithGoogle(idToken)) {
      navigate('/inicio', { replace: true })
    } else {
      setShakeKey((k) => k + 1)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-bg">
      <BrandPanel />

      <div className="flex min-w-0 flex-1 items-center justify-center overflow-y-auto p-6 min-[900px]:p-[38px]">
        <div className="flex w-full max-w-[340px] flex-col gap-[18px]">
          <div>
            <div className="text-[26px] font-extrabold tracking-[-0.025em] text-ink">{t('auth.loginTitle')}</div>
            <div className="mt-[5px] text-[12.5px]" style={{ color: 'var(--color-login-text-muted)' }}>
              {t('auth.loginSubtitle')}
            </div>
          </div>

          <GoogleSignInButton onToken={onGoogleToken} />

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span
              className="text-caption font-bold tracking-[0.08em]"
              style={{ color: 'var(--color-login-divider-label)' }}
            >
              {t('auth.orWithEmail')}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form
            key={shakeKey}
            onSubmit={onSubmit}
            className={cn('flex flex-col gap-[18px]', shakeKey > 0 && 'animate-shake')}
            noValidate
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-email"
                  className="text-caption font-bold tracking-[0.06em]"
                  style={{ color: 'var(--color-login-label)' }}
                >
                  {t('auth.emailFieldLabel')}
                </label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError(null)
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  error={emailError ?? undefined}
                  autoComplete="email"
                  className="h-[46px] rounded-[12px] text-[13px]"
                  style={{
                    background: 'var(--color-login-surface)',
                    color: 'var(--color-login-input-text)',
                    boxShadow: 'none',
                    ...(emailError
                      ? {}
                      : { borderColor: emailFocused ? 'var(--color-login-border-focus)' : 'var(--color-border-input)' }),
                  }}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="text-caption font-bold tracking-[0.06em]"
                    style={{ color: 'var(--color-login-label)' }}
                  >
                    {t('auth.passwordFieldLabel')}
                  </label>
                  <Link to="/recuperar" className="inline-flex min-h-6 items-center text-caption font-bold text-highlight">
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
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
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  error={passwordError ?? undefined}
                  autoComplete="current-password"
                  className="h-[46px] rounded-[12px] text-[13px]"
                  style={{
                    background: 'var(--color-login-surface)',
                    color: 'var(--color-login-input-text)',
                    boxShadow: 'none',
                    letterSpacing: showPassword ? undefined : '0.22em',
                    ...(passwordError
                      ? {}
                      : { borderColor: passwordFocused ? 'var(--color-login-border-focus)' : 'var(--color-border-input)' }),
                  }}
                  required
                />
              </div>
            </div>

            <RememberMeCheckbox checked={rememberMe} onChange={setRememberMe} />

            {error && (
              <p role="alert" className="text-xs font-medium text-negative">
                {error}
              </p>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              fullWidth
              className="h-12 rounded-[12px] active:opacity-90"
            >
              {t('auth.submitLogin')}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => void onGuest()}
            className="flex h-12 cursor-pointer items-center justify-center gap-[9px] rounded-[12px] border border-border-input text-label font-semibold text-ink hover:bg-surface-sunken"
          >
            <EnterIcon />
            {t('auth.guest')}
          </button>
          <div className="-mt-2 text-center text-caption text-v2-dim [line-height:normal]">{t('auth.guestHint')}</div>

          <div className="text-center text-xs" style={{ color: 'var(--color-login-text-muted)' }}>
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-bold text-highlight">
              {t('auth.signUpLink')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
