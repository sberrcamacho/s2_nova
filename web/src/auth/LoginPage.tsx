import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthShell } from '@/auth/AuthShell'
import { GoogleSignInButton } from '@/auth/GoogleSignInButton'
import { useAuth } from '@/state/AuthContext'
import { useTranslation } from '@/state/useTranslation'

export default function LoginPage() {
  const { login, loginWithGoogle, error, clearError, isSubmitting } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    if (await login({ email, password })) navigate('/overview', { replace: true })
  }

  const onGoogleToken = async (idToken: string) => {
    clearError()
    if (await loginWithGoogle(idToken)) navigate('/overview', { replace: true })
  }

  return (
    <AuthShell
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-bold text-primary">
            {t('auth.signUpLink')}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          type="email"
          label={t('auth.email')}
          leftIcon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <Input
          type={showPassword ? 'text' : 'password'}
          label={t('auth.password')}
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        {error && (
          <p role="alert" className="text-xs font-medium text-negative">
            {error}
          </p>
        )}
        <Button type="submit" loading={isSubmitting} fullWidth>
          {t('auth.submitLogin')}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-semibold text-ink-tertiary">
        <div className="h-px flex-1 bg-border" />
        {t('auth.orDivider')}
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleSignInButton onToken={onGoogleToken} />
    </AuthShell>
  )
}
