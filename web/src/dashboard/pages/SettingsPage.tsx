import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Coins, Download, Globe, Key, Laptop2, Mail, MapPin, Moon, Phone, ShieldAlert, Sun, User, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/state/AuthContext'
import { useTheme } from '@/state/ThemeContext'
import { useToast } from '@/state/ToastContext'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { userService } from '@/services/userService'
import { formatLongDate } from '@/lib/date'
import { cn } from '@/lib/cn'
import type { CurrencyCode, LanguageCode } from '@/types'

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const { mode, setMode } = useTheme()
  const { showToast } = useToast()
  const { currency, setCurrency } = useCurrency()
  const { t, language, setLanguage } = useTranslation()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [city, setCity] = useState(user?.city ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setName(user.name)
    setPhone(user.phone)
    setCity(user.city)
  }, [user?.id])

  if (!user) return null

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await userService.updateProfile({ name, phone, city })
    updateUser({ name, phone, city })
    setSaving(false)
    setEditing(false)
    showToast(t('settings.profileUpdatedToast'), 'success')
  }

  const toggleNotifications = async (checked: boolean) => {
    updateUser({ preferences: { ...user.preferences, notifications: checked } })
    await userService.updatePreferences({ notifications: checked })
  }

  const toggleHideAmounts = async (checked: boolean) => {
    updateUser({ preferences: { ...user.preferences, hideAmounts: checked } })
    await userService.updatePreferences({ hideAmounts: checked })
  }

  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-5">
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar initials={user.avatarInitials} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-ink">{user.name}</p>
            <p className="text-[12.5px] text-ink-tertiary">
              {user.email} · {user.city}
            </p>
            <p className="mt-1 text-[11.5px] text-ink-tertiary">
              {t('settings.memberSincePrefix')} {formatLongDate(user.memberSince, language)}
            </p>
          </div>
          <button
            onClick={() => setEditing((e) => !e)}
            className="shrink-0 rounded-[var(--radius-sm)] border border-border-strong px-3.5 py-2 text-xs font-bold text-ink-secondary transition-colors hover:bg-bg-secondary"
          >
            {t('settings.editProfile')}
          </button>
        </div>

        {editing && (
          <form onSubmit={onSave} className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
            <Input label={t('settings.fullName')} leftIcon={<User className="h-4 w-4" />} value={name} onChange={(e) => setName(e.target.value)} />
            <Input label={t('settings.email')} leftIcon={<Mail className="h-4 w-4" />} value={user.email} disabled />
            <Input label={t('settings.phone')} leftIcon={<Phone className="h-4 w-4" />} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label={t('settings.city')} leftIcon={<MapPin className="h-4 w-4" />} value={city} onChange={(e) => setCity(e.target.value)} />
            <Button type="submit" loading={saving} className="sm:col-span-2 sm:w-fit">
              {t('settings.saveChanges')}
            </Button>
          </form>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-[15px] font-bold text-ink">{t('settings.preferences')}</h3>
        <div className="mt-1 flex flex-col divide-y divide-[#16161f]">
          <PreferenceRow icon={<Globe className="h-4 w-4" />} label={t('settings.language')}>
            <Segmented
              value={language}
              onChange={(v) => setLanguage(v as LanguageCode)}
              options={[
                { value: 'es', label: t('settings.spanish') },
                { value: 'en', label: t('settings.english') },
              ]}
            />
          </PreferenceRow>

          <PreferenceRow icon={<Coins className="h-4 w-4" />} label={t('settings.currencyFormat')}>
            <Segmented
              value={currency}
              onChange={(v) => setCurrency(v as CurrencyCode)}
              options={[
                { value: 'COP', label: 'COP' },
                { value: 'USD', label: 'USD' },
              ]}
            />
          </PreferenceRow>

          <PreferenceRow
            icon={mode === 'dark' ? <Moon className="h-4 w-4" /> : mode === 'light' ? <Sun className="h-4 w-4" /> : <Laptop2 className="h-4 w-4" />}
            label={t('settings.theme')}
          >
            <Segmented
              value={mode}
              onChange={(v) => setMode(v as 'light' | 'dark' | 'system')}
              options={[
                { value: 'light', label: t('settings.light') },
                { value: 'dark', label: t('settings.dark') },
                { value: 'system', label: t('settings.system') },
              ]}
            />
          </PreferenceRow>

          <PreferenceRow label={t('settings.notifications')}>
            <Switch checked={user.preferences.notifications} onChange={toggleNotifications} label={t('settings.notifications')} />
          </PreferenceRow>

          <PreferenceRow label={t('settings.biometricLogin')} detail={t('settings.biometricAndroidOnly')}>
            <Switch checked={false} onChange={() => {}} disabled label={t('settings.biometricLogin')} />
          </PreferenceRow>

          <PreferenceRow label={t('settings.hideAmounts')} detail={t('settings.hideAmountsHint')}>
            <Switch checked={user.preferences.hideAmounts} onChange={toggleHideAmounts} label={t('settings.hideAmounts')} />
          </PreferenceRow>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-[15px] font-bold text-ink">{t('settings.security')}</h3>
        <div className="mt-1 flex flex-col divide-y divide-[#16161f]">
          <SecurityRow
            icon={<Key className="h-4 w-4" />}
            label={t('settings.password')}
            detail={t('settings.passwordHint')}
            actionLabel={t('settings.change')}
            onAction={() => showToast(t('common.comingSoon'), 'info')}
          />
          <SecurityRow
            icon={<Users className="h-4 w-4" />}
            label={t('settings.activeSessions')}
            detail={t('settings.activeSessionsHint')}
            actionLabel={t('settings.manage')}
            onAction={() => showToast(t('common.comingSoon'), 'info')}
          />
          <SecurityRow
            icon={<Download className="h-4 w-4" />}
            label={t('settings.exportData')}
            actionLabel={t('settings.exportData')}
            onAction={() => showToast(t('common.comingSoon'), 'info')}
          />
          <SecurityRow
            icon={<ShieldAlert className="h-4 w-4" />}
            label={t('settings.deleteAccount')}
            detail={t('settings.deleteAccountHint')}
            actionLabel={t('settings.deleteAccount')}
            destructive
            onAction={() => showToast(t('common.comingSoon'), 'info')}
          />
        </div>
        <p className="mt-4 text-xs font-medium text-ink-tertiary">{t('settings.demoDataNote')}</p>
      </Card>
    </div>
  )
}

function PreferenceRow({ icon, label, detail, children }: { icon?: ReactNode; label: string; detail?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-[15px]">
      <div className="flex items-center gap-3">
        {icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">{icon}</span>}
        <div>
          <p className="text-[13px] font-bold text-ink">{label}</p>
          {detail && <p className="text-[11.5px] text-ink-tertiary">{detail}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function SecurityRow({
  icon,
  label,
  detail,
  actionLabel,
  destructive,
  onAction,
}: {
  icon: ReactNode
  label: string
  detail?: string
  actionLabel: string
  destructive?: boolean
  onAction: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-[15px]">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            destructive ? 'bg-negative-soft text-negative' : 'bg-accent-soft text-primary',
          )}
        >
          {icon}
        </span>
        <div>
          <p className={cn('text-[13px] font-bold', destructive ? 'text-negative' : 'text-ink')}>{label}</p>
          {detail && <p className="text-[11.5px] text-ink-tertiary">{detail}</p>}
        </div>
      </div>
      <button
        onClick={onAction}
        className={cn(
          'shrink-0 rounded-[var(--radius-sm)] border px-3.5 py-2 text-xs font-bold transition-colors',
          destructive ? 'border-negative/35 text-negative hover:bg-negative-soft' : 'border-border-strong text-ink-secondary hover:bg-bg-secondary',
        )}
      >
        {actionLabel}
      </button>
    </div>
  )
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex overflow-hidden rounded-full border border-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'whitespace-nowrap px-3 py-1.5 text-xs font-bold transition-colors',
            value === opt.value ? 'bg-primary text-on-primary' : 'text-ink-secondary hover:text-ink',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
