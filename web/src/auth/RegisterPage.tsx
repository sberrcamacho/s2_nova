import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { GoogleSignInButton } from '@/auth/GoogleSignInButton'
import { useAuth } from '@/state/AuthContext'
import { useTranslation } from '@/state/useTranslation'

const BRAND_PANEL_GRADIENT = 'linear-gradient(150deg,#16123a 0%,#1d1650 55%,#241a5e 100%)'

const INCOME_VS_EXPENSES = [
  { month: 'Mar', income: 56, expense: 44 },
  { month: 'Abr', income: 64, expense: 49 },
  { month: 'May', income: 60, expense: 41 },
  { month: 'Jun', income: 73, expense: 52 },
  { month: 'Jul', income: 81, expense: 46 },
  { month: 'Ago', income: 94, expense: 48 },
]

function SignupBrandPanel() {
  const { t } = useTranslation()
  return (
    <div
      className="relative hidden w-[452px] shrink-0 flex-col justify-between overflow-hidden p-[38px] text-white min-[900px]:flex"
      style={{ background: BRAND_PANEL_GRADIENT }}
    >
      <div
        className="pointer-events-none absolute -right-[60px] -top-20 h-[260px] w-[260px] rounded-full"
        style={{ background: 'rgba(123,111,246,.4)', filter: 'blur(60px)' }}
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-2.5">
        <Logo variant="mark" tone="inverted" size="sm" />
        <div>
          <div className="text-[15px] font-extrabold tracking-[-0.01em]">S2 Nova</div>
          <div className="text-[9.5px] font-semibold tracking-[0.1em] text-white/42">PERSONAL FINANCE</div>
        </div>
      </div>

      <div className="relative flex flex-col gap-[26px]">
        <div className="text-[34px] font-extrabold leading-[1.14] tracking-[-0.03em] text-pretty">
          Empieza a ordenar
          <br />
          tus finanzas hoy.
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <div className="text-[10px] font-bold tracking-[0.11em] text-[#b9b0ff]">INGRESOS VS. GASTOS</div>
            <div className="text-[11px] text-white/45">Últimos 6 meses</div>
          </div>

          <div className="flex items-end gap-3">
            {INCOME_VS_EXPENSES.map(({ month, income, expense }) => (
              <div key={month} className="flex flex-1 flex-col items-center gap-2.5">
                <div className="flex h-[124px] w-full items-end gap-1">
                  <div className="flex-1 rounded-[3px] bg-[#8578ff]" style={{ height: `${income}%` }} />
                  <div className="flex-1 rounded-[3px] bg-white/20" style={{ height: `${expense}%` }} />
                </div>
                <div className="text-[11px] font-semibold text-white/45">{month}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-[18px]">
            <div className="flex items-center gap-2.5">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#8578ff]" />
              <span className="text-[12.5px] text-white/72">Ingresos</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-white/20" />
              <span className="text-[12.5px] text-white/72">Gastos</span>
            </div>
          </div>

          <div className="text-[13px] leading-[1.5] text-white/60 text-pretty">
            Los usuarios de S2 Nova ahorran en promedio un 18% más en su tercer mes, con todas sus cuentas en un solo
            balance.
          </div>
        </div>
      </div>

      <div className="relative text-[11.5px] text-white/45">{t('auth.encryptedData')}</div>
    </div>
  )
}

function SignupTermsCheckbox({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px]"
        style={{
          background: checked ? 'var(--color-login-primary)' : 'transparent',
          border: checked ? 'none' : '1px solid var(--color-border)',
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.3l2.2 2.2 4.8-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-xs leading-[1.45]" style={{ color: 'var(--color-login-checkbox-text)' }}>
        {t('auth.termsPrefix')}
        <span className="font-bold text-highlight">{t('auth.termsLink')}</span>
        {t('auth.termsMiddle')}
        <span className="font-bold text-highlight">{t('auth.privacyLink')}</span>
      </span>
    </label>
  )
}

function passwordStrengthScore(password: string): number {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (password.length >= 12 || /[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const { t } = useTranslation()
  if (!password) return null
  const score = passwordStrengthScore(password)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-[3px] flex-1 rounded-[2px]"
              style={{
                background: i < score ? 'var(--color-login-positive)' : 'var(--color-login-positive-bg)',
              }}
            />
          ))}
        </div>
        {score >= 3 && (
          <span className="text-[10.5px] font-bold" style={{ color: 'var(--color-login-positive)' }}>
            {t('auth.passwordStrengthSecure')}
          </span>
        )}
      </div>
      <div className="text-[11px]" style={{ color: 'var(--color-login-text-muted)' }}>
        {t('auth.passwordHint')}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const { register, loginWithGoogle, error, clearError, isSubmitting } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [termsError, setTermsError] = useState<string | null>(null)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()

    const nextNameError = name.trim() ? null : t('auth.nameRequired')
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    const nextEmailError = isEmailValid ? null : t('auth.invalidEmail')
    const isPasswordValid = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
    const nextPasswordError = isPasswordValid ? null : t('auth.passwordTooShort')
    const nextTermsError = agreedToTerms ? null : t('auth.termsRequired')
    setNameError(nextNameError)
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    setTermsError(nextTermsError)
    if (nextNameError || nextEmailError || nextPasswordError || nextTermsError) return

    if (await register({ name, email, password })) navigate('/overview', { replace: true })
  }

  const onGoogleToken = async (idToken: string) => {
    clearError()
    if (await loginWithGoogle(idToken)) navigate('/overview', { replace: true })
  }

  return (
    <div className="flex min-h-screen w-full bg-bg">
      <SignupBrandPanel />

      <div className="flex min-w-0 flex-1 items-center justify-center overflow-y-auto p-6 min-[900px]:p-[38px]">
        <div className="flex w-full max-w-[340px] flex-col gap-[18px]">
          <div>
            <div className="text-[26px] font-extrabold tracking-[-0.025em] text-ink">{t('auth.registerTitle')}</div>
            <div className="mt-[5px] text-[12.5px]" style={{ color: 'var(--color-login-text-muted)' }}>
              {t('auth.registerSubtitle')}
            </div>
          </div>

          <GoogleSignInButton onToken={onGoogleToken} label={t('auth.registerWithGoogle')} />

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span
              className="text-[10.5px] font-bold tracking-[0.08em]"
              style={{ color: 'var(--color-login-divider-label)' }}
            >
              {t('auth.orWithEmail')}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-[18px]" noValidate>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="register-name"
                  className="text-[11px] font-bold tracking-[0.06em]"
                  style={{ color: 'var(--color-login-label)' }}
                >
                  {t('auth.nameFieldLabel')}
                </label>
                <Input
                  id="register-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setNameError(null)
                  }}
                  error={nameError ?? undefined}
                  autoComplete="name"
                  className="h-[46px] rounded-[12px] text-[13px]"
                  style={{
                    background: 'var(--color-login-surface)',
                    color: 'var(--color-login-input-text)',
                    boxShadow: 'none',
                    ...(nameError ? {} : { borderColor: 'var(--color-border)' }),
                  }}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="register-email"
                  className="text-[11px] font-bold tracking-[0.06em]"
                  style={{ color: 'var(--color-login-label)' }}
                >
                  {t('auth.emailFieldLabel')}
                </label>
                <Input
                  id="register-email"
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
                      : { borderColor: emailFocused ? 'var(--color-login-border-focus)' : 'var(--color-border)' }),
                  }}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="register-password"
                  className="text-[11px] font-bold tracking-[0.06em]"
                  style={{ color: 'var(--color-login-label)' }}
                >
                  {t('auth.passwordFieldLabel')}
                </label>
                <Input
                  id="register-password"
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
                  autoComplete="new-password"
                  className="h-[46px] rounded-[12px] text-[13px]"
                  style={{
                    background: 'var(--color-login-surface)',
                    color: 'var(--color-login-input-text)',
                    boxShadow: 'none',
                    letterSpacing: showPassword ? undefined : '0.22em',
                    ...(passwordError
                      ? {}
                      : { borderColor: passwordFocused ? 'var(--color-login-border-focus)' : 'var(--color-border)' }),
                  }}
                  required
                />
                <PasswordStrengthMeter password={password} />
              </div>
            </div>

            <SignupTermsCheckbox checked={agreedToTerms} onChange={setAgreedToTerms} />
            {termsError && (
              <p role="alert" className="-mt-[10px] text-xs font-medium text-negative">
                {termsError}
              </p>
            )}

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
              {t('auth.submitRegister')}
            </Button>
          </form>

          <div className="text-center text-xs" style={{ color: 'var(--color-login-text-muted)' }}>
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="font-bold text-highlight">
              {t('auth.signInLink')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
