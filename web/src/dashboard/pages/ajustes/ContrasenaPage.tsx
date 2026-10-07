import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AjActions, AjCard, AjField, AjMessage, AjSubHeader } from '@/dashboard/components/ajustes/AjustesUi'
import { ApiError } from '@/lib/apiClient'
import { passwordRules } from '@/lib/ajustes'
import { userService } from '@/services/userService'
import { useAuth } from '@/state/AuthContext'
import { useTranslation } from '@/state/useTranslation'
import { cn } from '@/lib/cn'

// Ajustes › Cambiar contraseña: current, new, confirm. The backend closes
// every other session and keeps this one, so the user stays signed in
// here. An account that signs in with Google and has no password yet gets
// "Crear contraseña" instead (new + confirm), since there is no current
// password to ask for.
export default function ContrasenaPage() {
  const { user, updateUser } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  // Errors sit under the field they are about; anything else goes in the
  // message box above the buttons.
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [saving, setSaving] = useState(false)

  if (!user) return null
  const needsCurrent = user.hasPassword
  const rules = passwordRules(next, confirm)

  const edit = (setter: (value: string) => void, field: 'current' | 'next' | 'confirm') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value)
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setMessage(null)
  }

  const submit = async () => {
    if (saving) return
    const found: typeof errors = {}
    if (needsCurrent && !current) found.current = t('aj.pw.errCurrent')
    if (!rules[0].ok || !rules[1].ok) found.next = t('aj.pw.errRules')
    else if (needsCurrent && next === current) found.next = t('aj.pw.errSame')
    if (!rules[2].ok) found.confirm = t('aj.pw.errMatch')
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      await userService.changePassword({ currentPassword: needsCurrent ? current : undefined, newPassword: next })
      updateUser({ hasPassword: true, passwordChangedAt: new Date().toISOString() })
      setCurrent('')
      setNext('')
      setConfirm('')
      setMessage({ text: t(needsCurrent ? 'aj.pw.done' : 'aj.pw.created'), ok: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setErrors({ current: t('aj.pw.errWrong') })
      else setMessage({ text: err instanceof Error ? err.message : t('aj.pw.errRules'), ok: false })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex max-w-[676px] flex-col gap-5 px-4 pt-6 pb-12 min-[760px]:px-8 min-[760px]:pt-8">
      <AjSubHeader title={t(needsCurrent ? 'aj.pw.title' : 'aj.pw.createTitle')} subtitle={t(needsCurrent ? 'aj.pw.subtitle' : 'aj.pw.createSubtitle')} />
      <AjCard className="flex flex-col gap-4 p-[22px]">
        {needsCurrent && (
          <AjField tall label={t('aj.pw.current')} type="password" autoComplete="current-password" value={current} onChange={edit(setCurrent, 'current')} error={errors.current} />
        )}
        <AjField tall label={t('aj.pw.next')} type="password" autoComplete="new-password" value={next} onChange={edit(setNext, 'next')} placeholder={t('aj.pw.nextPlaceholder')} error={errors.next} />
        <AjField tall label={t('aj.pw.confirm')} type="password" autoComplete="new-password" value={confirm} onChange={edit(setConfirm, 'confirm')} placeholder={t('aj.pw.confirmPlaceholder')} error={errors.confirm} />
        <ul aria-label={t('aj.pw.rules')} className="flex flex-col gap-[7px]">
          {rules.map((rule) => (
            <li key={rule.key} className="flex items-center gap-[9px] text-body-sm">
              {/* A met rule shows a check, not only a green dot. */}
              <span className={cn('flex h-4 w-4 flex-none items-center justify-center rounded-full', rule.ok ? 'bg-positive text-white' : 'border border-border-input')}>
                {rule.ok && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
              </span>
              <span className={rule.ok ? 'text-ink' : 'text-ink-secondary'}>
                {t(rule.key)}
                <span className="sr-only">{rule.ok ? ` · ${t('aj.pw.ruleMet')}` : ` · ${t('aj.pw.ruleMissing')}`}</span>
              </span>
            </li>
          ))}
        </ul>
        {message && <AjMessage ok={message.ok}>{message.text}</AjMessage>}
        <div className="pt-1">
          <AjActions onCancel={() => navigate('/ajustes')} submitLabel={t(needsCurrent ? 'aj.pw.submit' : 'aj.pw.createSubmit')} onSubmit={submit} />
        </div>
      </AjCard>
    </div>
  )
}
