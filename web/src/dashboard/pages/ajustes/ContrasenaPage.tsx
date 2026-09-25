import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AjActions, AjCard, AjField, AjMessage, AjSubHeader } from '@/dashboard/components/ajustes/AjustesUi'
import { ApiError } from '@/lib/apiClient'
import { passwordRules } from '@/lib/ajustes'
import { userService } from '@/services/userService'
import { useAuth } from '@/state/AuthContext'
import { useTranslation } from '@/state/useTranslation'
import { cn } from '@/lib/cn'

// Ajustes › Cambiar contraseña. The backend closes every other session
// and keeps this one, so the user stays signed in here.
export default function ContrasenaPage() {
  const { user, updateUser } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [saving, setSaving] = useState(false)

  if (!user) return null
  const needsCurrent = user.hasPassword
  const rules = passwordRules(next, confirm)

  const edit = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value)
    setMessage(null)
  }

  const submit = async () => {
    if (saving) return
    let error = ''
    if (needsCurrent && !current) error = t('aj.pw.errCurrent')
    else if (!rules.every((rule) => rule.ok)) error = t('aj.pw.errRules')
    else if (needsCurrent && next === current) error = t('aj.pw.errSame')
    if (error) return setMessage({ text: error, ok: false })

    setSaving(true)
    try {
      await userService.changePassword({ currentPassword: needsCurrent ? current : undefined, newPassword: next })
      updateUser({ hasPassword: true, passwordChangedAt: new Date().toISOString() })
      setCurrent('')
      setNext('')
      setConfirm('')
      setMessage({ text: t('aj.pw.done'), ok: true })
    } catch (err) {
      const text = err instanceof ApiError && err.status === 401 ? t('aj.pw.errWrong') : err instanceof Error ? err.message : t('aj.pw.errRules')
      setMessage({ text, ok: false })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex max-w-[676px] flex-col gap-[18px] px-7 pt-[26px] pb-10">
      <AjSubHeader title={t('aj.pw.title')} subtitle={t('aj.pw.subtitle')} />
      <AjCard className="flex flex-col gap-4 p-[22px]">
        {needsCurrent && <AjField tall label={t('aj.pw.current')} type="password" autoComplete="current-password" value={current} onChange={edit(setCurrent)} placeholder="••••••••" />}
        <AjField tall label={t('aj.pw.next')} type="password" autoComplete="new-password" value={next} onChange={edit(setNext)} placeholder={t('aj.pw.nextPlaceholder')} />
        <AjField tall label={t('aj.pw.confirm')} type="password" autoComplete="new-password" value={confirm} onChange={edit(setConfirm)} placeholder={t('aj.pw.confirmPlaceholder')} />
        <div className="flex flex-col gap-[7px]">
          {rules.map((rule) => (
            <div key={rule.key} className="flex items-center gap-[9px] text-[12px]">
              <span className={cn('h-[7px] w-[7px] flex-none rounded-full', rule.ok ? 'bg-v2-pos' : 'bg-v2-line2')} />
              <span className={rule.ok ? 'text-v2-text' : 'text-v2-dim'}>{t(rule.key)}</span>
            </div>
          ))}
        </div>
        {message && <AjMessage ok={message.ok}>{message.text}</AjMessage>}
        <div className="pt-1">
          <AjActions onCancel={() => navigate('/ajustes')} submitLabel={t('aj.pw.submit')} onSubmit={submit} />
        </div>
      </AjCard>
    </div>
  )
}
