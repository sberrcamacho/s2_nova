import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AjActions, AjCard, AjField, AjMessage, AjSubHeader } from '@/dashboard/components/ajustes/AjustesUi'
import { ApiError } from '@/lib/apiClient'
import { EMAIL_PATTERN, initialsOf } from '@/lib/ajustes'
import { userService } from '@/services/userService'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'

// Ajustes › Editar perfil: name, email, phone and city — the same profile
// Android edits under Ajustes › Información personal. The backend only
// changes the email with the current password, so that one field appears
// when the email is edited.
export default function PerfilPage() {
  const { user, updateUser } = useAuth()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(() => ({ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', city: user?.city ?? '' }))
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!user) return null
  const emailChanged = draft.email.trim().toLowerCase() !== user.email.toLowerCase()

  const set = (key: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((d) => ({ ...d, [key]: e.target.value }))
    setError('')
  }

  const save = async () => {
    if (saving) return
    if (!draft.name.trim()) return setError(t('aj.pr.errName'))
    if (!EMAIL_PATTERN.test(draft.email.trim())) return setError(t('aj.pr.errEmail'))
    if (emailChanged && !user.hasPassword) return setError(t('aj.pr.errNoPassword'))
    if (emailChanged && !password) return setError(t('aj.pr.errEmailPassword'))

    setSaving(true)
    try {
      const updated = await userService.updateProfile({
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        city: draft.city.trim(),
        ...(emailChanged ? { email: draft.email.trim(), currentPassword: password } : {}),
      })
      updateUser(updated)
      showToast(t('aj.pr.saved'), 'success')
      navigate('/ajustes')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError(t('aj.pw.errWrong'))
      else if (err instanceof ApiError && err.status === 409) setError(t('aj.pr.errEmailTaken'))
      else setError(err instanceof Error ? err.message : t('aj.pr.errName'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex max-w-[736px] flex-col gap-[18px] px-7 pt-[26px] pb-10">
      <AjSubHeader title={t('aj.editProfile')} subtitle={t('aj.pr.subtitle')} />
      <AjCard className="flex flex-col gap-[18px] p-[22px]">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-v2-accent text-[20px] font-extrabold text-white">{initialsOf(draft.name)}</div>
          <div className="text-[12px] text-v2-dim">{t('aj.pr.avatarHint')}</div>
        </div>
        <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
          <AjField label={t('aj.pr.name')} type="text" autoComplete="name" value={draft.name} onChange={set('name')} placeholder={t('aj.pr.namePlaceholder')} />
          <AjField label={t('aj.pr.email')} type="email" autoComplete="email" value={draft.email} onChange={set('email')} placeholder={t('aj.pr.emailPlaceholder')} />
          <AjField label={t('aj.pr.phone')} type="tel" autoComplete="tel" value={draft.phone} onChange={set('phone')} placeholder="+57 300 000 0000" />
          <AjField label={t('aj.pr.city')} type="text" autoComplete="address-level2" value={draft.city} onChange={set('city')} placeholder={t('aj.pr.cityPlaceholder')} />
          {emailChanged && user.hasPassword && (
            <AjField
              label={t('aj.pr.emailPassword')}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="••••••••"
            />
          )}
        </div>
        {error && <AjMessage>{error}</AjMessage>}
        <AjActions onCancel={() => navigate('/ajustes')} submitLabel={t('aj.pr.save')} onSubmit={save} />
      </AjCard>
    </div>
  )
}
