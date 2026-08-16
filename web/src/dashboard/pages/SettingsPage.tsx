import { useEffect, useState, type FormEvent } from 'react'
import { Bell, Coins, Database, Download, Fingerprint, Globe, Mail, MapPin, Moon, Phone, Shield, Sparkles, Sun, User } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/state/AuthContext'
import { useAppData } from '@/state/AppDataContext'
import { useTheme } from '@/state/ThemeContext'
import { useToast } from '@/state/ToastContext'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { userService } from '@/services/userService'
import { formatLongDate } from '@/lib/date'
import type { CurrencyCode, LanguageCode } from '@/types'

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const { transactions, budgets } = useAppData()
  const { theme, setTheme } = useTheme()
  const { showToast } = useToast()
  const { format, currency, setCurrency } = useCurrency()
  const { t, language, setLanguage } = useTranslation()

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
    showToast(t('settings.profileUpdatedToast'), 'success')
  }

  const toggleNotifications = async (checked: boolean) => {
    updateUser({ preferences: { ...user.preferences, notifications: checked } })
    await userService.updatePreferences({ notifications: checked })
  }

  const toggleBiometric = async (checked: boolean) => {
    updateUser({ preferences: { ...user.preferences, biometricLogin: checked } })
    await userService.updatePreferences({ biometricLogin: checked })
  }

  const totalSaved = budgets.reduce((s, b) => s + Math.max(0, b.remaining), 0)

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div className="flex flex-col gap-5 xl:col-span-1">
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <Avatar initials={user.avatarInitials} size="lg" />
          <div>
            <p className="text-base font-bold text-ink">{user.name}</p>
            <p className="text-[13px] text-ink-tertiary">{user.email}</p>
          </div>
          <Badge tone="primary" icon={<Sparkles className="h-3 w-3" />}>
            {t('sidebar.demoAccount')}
          </Badge>
          <p className="text-xs font-medium text-ink-tertiary">{user.city}</p>
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <h3 className="text-[13px] font-bold text-ink">{t('settings.accountSummary')}</h3>
          <StatRow label={t('settings.memberSince')} value={formatLongDate(user.memberSince, language)} />
          <StatRow label={t('settings.transactions')} value={String(transactions.length)} />
          <StatRow label={t('settings.activeBudgets')} value={String(budgets.length)} />
          <StatRow label={t('settings.availableInBudgets')} value={format(totalSaved)} />
        </Card>
      </div>

      <div className="flex flex-col gap-5 xl:col-span-2">
        <Card className="p-6">
          <h3 className="mb-4 text-[15px] font-bold text-ink">{t('settings.personalInfo')}</h3>
          <form onSubmit={onSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label={t('settings.fullName')} leftIcon={<User className="h-4 w-4" />} value={name} onChange={(e) => setName(e.target.value)} />
            <Input label={t('settings.email')} leftIcon={<Mail className="h-4 w-4" />} value={user.email} disabled />
            <Input label={t('settings.phone')} leftIcon={<Phone className="h-4 w-4" />} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label={t('settings.city')} leftIcon={<MapPin className="h-4 w-4" />} value={city} onChange={(e) => setCity(e.target.value)} />
            <Button type="submit" loading={saving} className="sm:col-span-2 sm:w-fit">
              {t('settings.saveChanges')}
            </Button>
          </form>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h3 className="text-[15px] font-bold text-ink">{t('settings.preferences')}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PreferenceTile icon={theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} label={t('settings.theme')}>
              <div className="flex overflow-hidden rounded-full border border-border">
                {(['light', 'dark'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setTheme(opt)}
                    className={`whitespace-nowrap px-3 py-1 text-xs font-bold transition-colors ${theme === opt ? 'bg-primary text-on-primary' : 'text-ink-secondary'}`}
                  >
                    {opt === 'light' ? t('settings.light') : t('settings.dark')}
                  </button>
                ))}
              </div>
            </PreferenceTile>
            <PreferenceTile icon={<Bell className="h-4 w-4" />} label={t('settings.notifications')}>
              <Switch checked={user.preferences.notifications} onChange={toggleNotifications} label={t('settings.notifications')} />
            </PreferenceTile>
            <PreferenceTile icon={<Fingerprint className="h-4 w-4" />} label={t('settings.biometricLogin')}>
              <Switch checked={user.preferences.biometricLogin} onChange={toggleBiometric} label={t('settings.biometricLogin')} />
            </PreferenceTile>
            <PreferenceTile icon={<Coins className="h-4 w-4" />} label={t('settings.currencyFormat')}>
              <div className="flex overflow-hidden rounded-full border border-border">
                {(['COP', 'USD'] as CurrencyCode[]).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setCurrency(opt)}
                    className={`whitespace-nowrap px-3 py-1 text-xs font-bold transition-colors ${currency === opt ? 'bg-primary text-on-primary' : 'text-ink-secondary'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </PreferenceTile>
            <PreferenceTile icon={<Globe className="h-4 w-4" />} label={t('settings.language')}>
              <div className="flex overflow-hidden rounded-full border border-border">
                {(['es', 'en'] as LanguageCode[]).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setLanguage(opt)}
                    className={`whitespace-nowrap px-3 py-1 text-xs font-bold transition-colors ${language === opt ? 'bg-primary text-on-primary' : 'text-ink-secondary'}`}
                  >
                    {opt === 'es' ? t('settings.spanish') : t('settings.english')}
                  </button>
                ))}
              </div>
            </PreferenceTile>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          <h3 className="text-[15px] font-bold text-ink">{t('settings.dataPrivacy')}</h3>
          <button
            onClick={() => showToast(t('common.comingSoon'), 'info')}
            className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border p-4 text-left transition-colors hover:bg-bg-secondary"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-primary">
              <Download className="h-4 w-4" />
            </span>
            <span className="flex-1 text-[13.5px] font-semibold text-ink">{t('settings.exportData')}</span>
          </button>
          <button
            onClick={() => showToast(t('common.comingSoon'), 'info')}
            className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border p-4 text-left transition-colors hover:bg-bg-secondary"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-primary">
              <Shield className="h-4 w-4" />
            </span>
            <span className="flex-1 text-[13.5px] font-semibold text-ink">{t('settings.privacySecurity')}</span>
          </button>
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-bg-secondary p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink-tertiary">
              <Database className="h-4 w-4" />
            </span>
            <p className="text-xs font-medium text-ink-tertiary">{t('settings.demoDataNote')}</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-ink-tertiary">{label}</span>
      <span className="font-numeric font-bold text-ink">{value}</span>
    </div>
  )
}

function PreferenceTile({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[var(--radius-md)] border border-border p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">{icon}</span>
        <span className="text-[13.5px] font-semibold text-ink">{label}</span>
      </div>
      {children}
    </div>
  )
}
