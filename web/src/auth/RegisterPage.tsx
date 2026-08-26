import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthShell } from '@/auth/AuthShell'
import { GoogleSignInButton } from '@/auth/GoogleSignInButton'
import { useAuth } from '@/state/AuthContext'
import { useTranslation } from '@/state/useTranslation'

export default function RegisterPage() {
  const { register, loginWithGoogle, error, clearError, isSubmitting } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError(null)
    if (password !== confirmPassword) {
      setLocalError(t('settings.passwordMismatch'))
      return
    }
    if (await register({ name, email, password })) navigate('/overview', { replace: true })
  }

  const onGoogleToken = async (idToken: string) => {
    clearError()
    setLocalError(null)
    if (await loginWithGoogle(idToken)) navigate('/overview', { replace: true })
  }

  return (
    <AuthShell
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <>
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="font-bold text-primary">
            {t('auth.signInLink')}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label={t('auth.fullName')}
          leftIcon={<User className="h-4 w-4" />}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />
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
          autoComplete="new-password"
          minLength={6}
          required
        />
        <Input
          type={showPassword ? 'text' : 'password'}
          label={t('auth.confirmPassword')}
          leftIcon={<Lock className="h-4 w-4" />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
        {(localError || error) && (
          <p role="alert" className="text-xs font-medium text-negative">
            {localError || error}
          </p>
        )}
        <Button type="submit" loading={isSubmitting} fullWidth>
          {t('auth.submitRegister')}
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
