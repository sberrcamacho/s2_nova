import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Circle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { EMAIL_PATTERN, passwordRules } from '@/lib/ajustes'
import { ApiError } from '@/lib/apiClient'
import { authService } from '@/services/authService'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/state/useTranslation'

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-bg p-6">
      <div className="flex w-full max-w-[360px] flex-col gap-[18px]">
        <Logo variant="mark" size="sm" />
        <div>
          <h1 className="text-headline font-extrabold tracking-[-0.025em] text-ink">{title}</h1>
          <p className="mt-[5px] text-body-sm text-ink-secondary">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

// "¿Olvidaste?" on the login: asks for the email and always answers the same
// way, so it can't be used to find out who has an account.
export function RecuperarPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!EMAIL_PATTERN.test(email.trim())) return setError(t('auth.invalidEmail'))
    setError('')
    setBusy(true)
    try {
      await authService.forgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell title={t('auth.rec.title')} subtitle={t('auth.rec.subtitle')}>
      {sent ? (
        <p role="status" className="rounded-[10px] bg-positive-soft px-3 py-2.5 text-body-sm font-semibold text-positive">
          {t('auth.rec.sent')}
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Input label={t('auth.emailFieldLabel')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error || undefined} />
          <Button type="submit" loading={busy} fullWidth className="h-12 rounded-[12px]">
            {t('auth.rec.send')}
          </Button>
        </form>
      )}
      <Link to="/login" className="text-center text-label font-semibold text-link">
        {t('auth.rec.back')}
      </Link>
    </Shell>
  )
}

// The page the emailed link opens (/restablecer?token=…).
export function NuevaContrasenaPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [invalidLink, setInvalidLink] = useState(!token)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const rules = passwordRules(next, confirm)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!rules.every((rule) => rule.ok)) return setError(t('aj.pw.errRules'))
    setError('')
    setBusy(true)
    try {
      await authService.resetPassword(token, next)
      setDone(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) setInvalidLink(true)
      else setError(err instanceof Error ? err.message : t('api.generic'))
    } finally {
      setBusy(false)
    }
  }

  if (invalidLink) {
    return (
      <Shell title={t('auth.rec.newTitle')} subtitle={t('auth.rec.invalid')}>
        <Button type="button" fullWidth className="h-12 rounded-[12px]" onClick={() => navigate('/recuperar')}>
          {t('auth.rec.again')}
        </Button>
      </Shell>
    )
  }

  if (done) {
    return (
      <Shell title={t('auth.rec.newTitle')} subtitle={t('auth.rec.done')}>
        <Button type="button" fullWidth className="h-12 rounded-[12px]" onClick={() => navigate('/login', { replace: true })}>
          {t('auth.rec.back')}
        </Button>
      </Shell>
    )
  }

  return (
    <Shell title={t('auth.rec.newTitle')} subtitle={t('auth.rec.newSubtitle')}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input label={t('auth.rec.newPassword')} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        <Input label={t('auth.rec.confirm')} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={error || undefined} />
        <ul className="flex flex-col gap-1 text-body-sm">
          {rules.map((rule) => (
            <li key={rule.key} className={cn('flex items-center gap-2', rule.ok ? 'text-positive' : 'text-ink-secondary')}>
              {rule.ok ? <Check className="h-4 w-4 flex-none" aria-hidden="true" /> : <Circle className="h-4 w-4 flex-none" aria-hidden="true" />}
              {t(rule.key)}
            </li>
          ))}
        </ul>
        <Button type="submit" loading={busy} fullWidth className="h-12 rounded-[12px]">
          {t('auth.rec.submit')}
        </Button>
      </form>
    </Shell>
  )
}
