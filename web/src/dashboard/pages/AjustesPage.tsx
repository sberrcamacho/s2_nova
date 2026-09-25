import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AjCard, AjCardTitle, AjOutlineButton, AjPills, AjRow, AjSwitch } from '@/dashboard/components/ajustes/AjustesUi'
import { accountService } from '@/services/accountService'
import { userService, type Session } from '@/services/userService'
import { useAuth } from '@/state/AuthContext'
import { useCurrency } from '@/state/useCurrency'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useTheme, type ThemePreference } from '@/state/ThemeContext'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { initialsOf, timeAgo } from '@/lib/ajustes'
import { formatCOP, formatUSD } from '@/lib/currency'
import { MONTHS_LONG, fill } from '@/lib/inicio'
import type { CurrencyCode, LanguageCode } from '@/types'

// Ajustes (Dashboard v2 › Settings): profile card, Preferencias and
// Seguridad. Each "Cambiar"/"Administrar"/"Eliminar"/"Editar perfil"
// opens its own view under /ajustes/*.
export default function AjustesPage() {
  const { user, updateUser } = useAuth()
  const { t, language, setLanguage } = useTranslation()
  const { currency, setCurrency } = useCurrency()
  const { preference: theme, setPreference: setTheme } = useTheme()
  const { hidden, toggle: toggleHidden } = useHideAmounts()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [walletTotal, setWalletTotal] = useState<number | null>(null)
  const [sessions, setSessions] = useState<Session[] | null>(null)

  useEffect(() => {
    accountService.getWallets().then((wallets) => setWalletTotal(wallets.reduce((sum, w) => sum + w.currentBalance, 0)), () => setWalletTotal(null))
    userService.getSessions().then(setSessions, () => setSessions(null))
  }, [])

  if (!user) return null

  const [year, month] = user.memberSince.split('-').map(Number)
  const memberSince = fill(t('aj.memberSince'), `${MONTHS_LONG[language][month - 1]} ${year}`)
  const city = user.city.trim()

  const onTheme = (next: ThemePreference) => {
    const previous = theme
    setTheme(next)
    updateUser({ preferences: { ...user.preferences, theme: next } })
    userService.updatePreferences({ theme: next }).catch((err) => {
      setTheme(previous)
      updateUser({ preferences: { ...user.preferences, theme: previous } })
      showToast(err instanceof Error ? err.message : 'Algo salió mal. Intenta de nuevo.', 'error')
    })
  }

  const toggleNotifications = () => {
    const next = !user.preferences.notifications
    updateUser({ preferences: { ...user.preferences, notifications: next } })
    userService.updatePreferences({ notifications: next }).catch((err) => {
      updateUser({ preferences: { ...user.preferences, notifications: !next } })
      showToast(err instanceof Error ? err.message : 'Algo salió mal. Intenta de nuevo.', 'error')
    })
  }

  const currencyDetail =
    walletTotal === null
      ? ''
      : currency === 'COP'
        ? fill(t('aj.currencyCOP'), formatCOP(walletTotal))
        : fill(t('aj.currencyUSD'), `US${formatUSD(walletTotal)}`)

  const passwordDetail = user.hasPassword
    ? user.passwordChangedAt
      ? fill(t('aj.passwordChanged'), timeAgo(user.passwordChangedAt, Date.now(), t))
      : ''
    : t('aj.passwordNone')

  const sessionsSummary = (sessions ?? []).map((s) => (s.current ? t('aj.thisBrowser') : (s.device ?? t('aj.ses.unknown')))).join(' · ')

  return (
    <div className="flex max-w-[976px] flex-col gap-[18px] px-7 pt-[26px] pb-10">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-.025em]">{t('aj.title')}</h1>
        <div className="mt-[3px] text-[12.5px] text-v2-dim">{t('aj.subtitle')}</div>
      </div>

      <AjCard className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-v2-accent text-[18px] font-extrabold">{initialsOf(user.name)}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-extrabold tracking-[-.015em]">{user.name}</div>
            <div className="mt-0.5 text-[12.5px] text-v2-dim">{city ? `${user.email} · ${city}` : user.email}</div>
            <div className="mt-0.5 text-[11.5px] text-v2-dim">{memberSince}</div>
          </div>
          <AjOutlineButton onClick={() => navigate('/ajustes/perfil')}>{t('aj.editProfile')}</AjOutlineButton>
        </div>
      </AjCard>

      <AjCard className="p-5">
        <AjCardTitle>{t('aj.preferences')}</AjCardTitle>
        <div className="mt-2 flex flex-col">
          <AjRow label={t('aj.language')} detail={t('aj.languageHint')}>
            <AjPills<LanguageCode>
              value={language}
              onChange={setLanguage}
              options={[
                { value: 'es', label: 'Español' },
                { value: 'en', label: 'English' },
              ]}
            />
          </AjRow>
          <AjRow label={t('aj.currency')} detail={currencyDetail}>
            <AjPills<CurrencyCode>
              value={currency}
              onChange={setCurrency}
              options={[
                { value: 'COP', label: t('aj.currencyOptCOP') },
                { value: 'USD', label: t('aj.currencyOptUSD') },
              ]}
            />
          </AjRow>
          <AjRow label={t('aj.theme')} detail={t('aj.themeHint')}>
            <AjPills<ThemePreference>
              value={theme}
              onChange={onTheme}
              options={[
                { value: 'light', label: t('aj.themeLight') },
                { value: 'dark', label: t('aj.themeDark') },
                { value: 'system', label: t('aj.themeSystem') },
              ]}
            />
          </AjRow>
          <AjRow label={t('aj.notifications')} detail={t('aj.notificationsHint')}>
            <AjSwitch on={user.preferences.notifications} label={t('aj.notifications')} onToggle={toggleNotifications} />
          </AjRow>
          <AjRow label={t('aj.hideAmounts')} detail={t('aj.hideAmountsHint')}>
            <AjSwitch on={hidden} label={t('aj.hideAmounts')} onToggle={toggleHidden} />
          </AjRow>
        </div>
      </AjCard>

      <AjCard className="p-5">
        <AjCardTitle>{t('aj.security')}</AjCardTitle>
        <div className="mt-2 flex flex-col">
          <AjRow label={t('aj.password')} detail={passwordDetail}>
            <AjOutlineButton onClick={() => navigate('/ajustes/contrasena')}>{t('aj.change')}</AjOutlineButton>
          </AjRow>
          <AjRow label={t('aj.sessions')} detail={sessionsSummary}>
            <AjOutlineButton onClick={() => navigate('/ajustes/sesiones')}>{t('aj.manage')}</AjOutlineButton>
          </AjRow>
          <AjRow label={t('aj.deleteAccount')} detail={t('aj.deleteAccountHint')} danger last>
            <AjOutlineButton danger onClick={() => navigate('/ajustes/eliminar')}>
              {t('aj.delete')}
            </AjOutlineButton>
          </AjRow>
        </div>
      </AjCard>
    </div>
  )
}
