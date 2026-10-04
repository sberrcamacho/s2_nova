import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AjCard, AjCardTitle, AjOutlineButton, AjPills, AjRow, AjSegmented, AjSwitch } from '@/dashboard/components/ajustes/AjustesUi'
import { parentCategories, useCategories } from '@/lib/backendCategories'
import { currencyService, type UserCurrency } from '@/services/currencyService'
import { userService, type Session } from '@/services/userService'
import { useAuth } from '@/state/AuthContext'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useTheme, type ThemePreference } from '@/state/ThemeContext'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { initialsOf, timeAgo } from '@/lib/ajustes'
import { MONTHS_LONG, fill } from '@/lib/inicio'
import type { LanguageCode } from '@/types'

// Ajustes (Dashboard v2 › Settings): profile card, Preferencias and
// Seguridad. Each "Cambiar"/"Administrar"/"Eliminar"/"Editar perfil"
// opens its own view under /ajustes/*.
export default function AjustesPage() {
  const { user, updateUser } = useAuth()
  const { t, language, setLanguage } = useTranslation()
  const { preference: theme, setPreference: setTheme } = useTheme()
  const { hidden, toggle: toggleHidden } = useHideAmounts()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [currencies, setCurrencies] = useState<UserCurrency[] | null>(null)
  const categories = useCategories()
  const [sessions, setSessions] = useState<Session[] | null>(null)

  useEffect(() => {
    currencyService.getMine().then(setCurrencies, () => setCurrencies(null))
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
      showToast(err instanceof Error ? err.message : t('api.generic'), 'error')
    })
  }

  const toggleNotifications = () => {
    const next = !user.preferences.notifications
    updateUser({ preferences: { ...user.preferences, notifications: next } })
    userService.updatePreferences({ notifications: next }).catch((err) => {
      updateUser({ preferences: { ...user.preferences, notifications: !next } })
      showToast(err instanceof Error ? err.message : t('api.generic'), 'error')
    })
  }

  // "COP principal · USD, EUR"
  const principal = user.principalCurrency
  const others = (currencies ?? []).filter((c) => c.code !== principal).map((c) => c.code)
  const currencyDetail = fill(t('aj.cur.detail'), principal) + (others.length ? ` · ${others.join(', ')}` : '')

  const customCount = categories.filter((c) => c.custom).length
  const catSummary = fill(t('aj.cat.summary'), parentCategories(false).length, parentCategories(true).length) + (customCount ? fill(t('aj.cat.custom'), customCount) : '')

  const replayGuides = () => {
    updateUser({ guidesSeen: [], guidesOff: false })
    void userService.updateGuides({ guidesSeen: [], guidesOff: false })
    showToast(t('aj.guides.toast'))
  }

  // Not in the web mockup: kept for parity with Android's setting, which
  // the server also enforces (backend lib/sessions.ts).
  const onAutoLock = (value: string) => {
    const next = Number(value)
    const previous = user.preferences.autoLockMinutes
    updateUser({ preferences: { ...user.preferences, autoLockMinutes: next } })
    userService.updatePreferences({ autoLockMinutes: next }).catch((err) => {
      updateUser({ preferences: { ...user.preferences, autoLockMinutes: previous } })
      showToast(err instanceof Error ? err.message : t('api.generic'), 'error')
    })
  }

  const passwordDetail = user.hasPassword
    ? user.passwordChangedAt
      ? fill(t('aj.passwordChanged'), timeAgo(user.passwordChangedAt, Date.now(), t))
      : ''
    : t('aj.passwordNone')

  const sessionsSummary = (sessions ?? []).map((s) => (s.current ? t('aj.thisBrowser') : (s.device ?? t('aj.ses.unknown')))).join(' · ')

  return (
    <div className="flex max-w-[976px] flex-col gap-5 px-4 pt-6 pb-12 min-[760px]:px-8 min-[760px]:pt-8">
      <div>
        <h1 className="text-display-sm font-medium tracking-[-.025em]">{t('aj.title')}</h1>
        <div className="mt-1 text-body-sm text-ink-secondary">{t('aj.subtitle')}</div>
      </div>

      <AjCard className="p-5">
        {/* The button drops under the identity on a narrow card. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-primary text-title font-semibold text-on-primary">{initialsOf(user.name)}</div>
          <div className="min-w-[180px] flex-1">
            <div className="truncate text-title font-semibold">{user.name}</div>
            <div className="truncate text-body-sm text-ink-secondary">{city ? `${user.email} · ${city}` : user.email}</div>
            <div className="text-body-sm text-ink-tertiary">{memberSince}</div>
          </div>
          <AjOutlineButton onClick={() => navigate('/ajustes/perfil')}>{t('aj.editProfile')}</AjOutlineButton>
        </div>
      </AjCard>

      <AjCard className="p-5">
        <AjCardTitle>{t('aj.preferences')}</AjCardTitle>
        <div className="mt-2 flex flex-col">
          <AjRow label={t('aj.language')} detail={t('aj.languageHint')}>
            <AjSegmented<LanguageCode>
              label={t('aj.language')}
              value={language}
              onChange={setLanguage}
              options={[
                { value: 'es', label: 'Español' },
                { value: 'en', label: 'English' },
              ]}
            />
          </AjRow>
          <AjRow label={t('aj.currencies')} detail={currencyDetail}>
            <AjOutlineButton onClick={() => navigate('/ajustes/monedas')}>{t('aj.manage')}</AjOutlineButton>
          </AjRow>
          <AjRow label={t('aj.guides')} detail={t('aj.guides.detail')}>
            <AjOutlineButton onClick={replayGuides}>{t('aj.guides.again')}</AjOutlineButton>
          </AjRow>
          <AjRow label={t('aj.theme')} detail={t('aj.themeHint')}>
            <AjSegmented<ThemePreference>
              label={t('aj.theme')}
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
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <AjCardTitle>{t('cat.title')}</AjCardTitle>
            <div className="text-body-sm text-ink-secondary">{catSummary}</div>
          </div>
          <AjOutlineButton onClick={() => navigate('/ajustes/categorias')}>{t('aj.manage')}</AjOutlineButton>
        </div>
      </AjCard>

      <AjCard className="p-5">
        <AjCardTitle>{t('aj.security')}</AjCardTitle>
        <div className="mt-2 flex flex-col">
          <AjRow label={t('aj.password')} detail={passwordDetail}>
            <AjOutlineButton onClick={() => navigate('/ajustes/contrasena')}>{t('aj.change')}</AjOutlineButton>
          </AjRow>
          <AjRow label={t('aj.autoLock')} detail={t('aj.autoLockHint')}>
            <AjPills<string>
              value={String(user.preferences.autoLockMinutes)}
              onChange={onAutoLock}
              options={[
                { value: '0', label: t('aj.autoLockNever') },
                { value: '1', label: '1 min' },
                { value: '5', label: '5 min' },
                { value: '15', label: '15 min' },
                { value: '60', label: '60 min' },
              ]}
            />
          </AjRow>
          <AjRow label={t('aj.sessions')} detail={sessionsSummary} last>
            <AjOutlineButton onClick={() => navigate('/ajustes/sesiones')}>{t('aj.manage')}</AjOutlineButton>
          </AjRow>
        </div>
      </AjCard>

      <AjCard className="p-5">
        <AjCardTitle>{t('aj.data')}</AjCardTitle>
        <div className="mt-2 flex flex-col">
          <AjRow label={t('aj.import')} detail={t('aj.importHint')} last>
            <AjOutlineButton onClick={() => navigate('/ajustes/importar')}>{t('aj.importBtn')}</AjOutlineButton>
          </AjRow>
        </div>
      </AjCard>

      <AjCard className="p-5" style={{ borderColor: 'var(--color-negative)' }}>
        <h2 className="text-title font-semibold text-negative">{t('aj.risk.title')}</h2>
        <div className="text-body-sm text-ink-secondary">{t('aj.risk.hint')}</div>
        <div className="mt-2 flex flex-col">
          <AjRow label={t('aj.reset')} detail={t('aj.resetHint')} danger>
            <AjOutlineButton danger onClick={() => navigate('/ajustes/restablecer')}>
              {t('aj.resetBtn')}
            </AjOutlineButton>
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
