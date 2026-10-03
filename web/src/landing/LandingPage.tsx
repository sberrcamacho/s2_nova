import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Coins,
  Fingerprint,
  HandCoins,
  Monitor,
  PiggyBank,
  ReceiptText,
  ScanBarcode,
  Smartphone,
  Target,
  EyeOff,
  Bell,
  FileSpreadsheet,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/state/AuthContext'
import { useTranslation } from '@/state/useTranslation'
import type { TranslationKey } from '@/lib/i18n/translations'

// Public front page for signed-out visitors at `/`. Built from the
// DESIGN-SYSTEM.md tokens; the hero preview is the only brand gradient.

const FEATURES: { icon: LucideIcon; title: TranslationKey; body: TranslationKey }[] = [
  { icon: ReceiptText, title: 'landing.f.movements', body: 'landing.f.movementsBody' },
  { icon: PiggyBank, title: 'landing.f.budgets', body: 'landing.f.budgetsBody' },
  { icon: Target, title: 'landing.f.goals', body: 'landing.f.goalsBody' },
  { icon: HandCoins, title: 'landing.f.loans', body: 'landing.f.loansBody' },
  { icon: BarChart3, title: 'landing.f.reports', body: 'landing.f.reportsBody' },
  { icon: Coins, title: 'landing.f.currencies', body: 'landing.f.currenciesBody' },
]

const PHONE_POINTS: { icon: LucideIcon; text: TranslationKey }[] = [
  { icon: ReceiptText, text: 'landing.phone.p1' },
  { icon: Bell, text: 'landing.phone.p2' },
  { icon: ScanBarcode, text: 'landing.phone.p3' },
]

const WEB_POINTS: { icon: LucideIcon; text: TranslationKey }[] = [
  { icon: BarChart3, text: 'landing.web.p1' },
  { icon: Monitor, text: 'landing.web.p2' },
  { icon: FileSpreadsheet, text: 'landing.web.p3' },
]

const TRUST: { icon: LucideIcon; title: TranslationKey; body: TranslationKey }[] = [
  { icon: Fingerprint, title: 'landing.t.bio', body: 'landing.t.bioBody' },
  { icon: EyeOff, title: 'landing.t.hide', body: 'landing.t.hideBody' },
  { icon: Monitor, title: 'landing.t.sessions', body: 'landing.t.sessionsBody' },
]

// Illustrative bars for the preview card (relative heights, not data).
const PREVIEW_BARS = [46, 62, 54, 78, 66, 92]

function HeroPreview() {
  const { t } = useTranslation()
  const rows: { title: string; meta: string; amount: string; positive?: boolean }[] = [
    { title: t('landing.preview.row1'), meta: t('landing.preview.row1Meta'), amount: '−$168.500' },
    { title: t('landing.preview.row2'), meta: t('landing.preview.row2Meta'), amount: '+$3.200.000', positive: true },
    { title: t('landing.preview.row3'), meta: t('landing.preview.row3Meta'), amount: '−$21.000' },
  ]
  return (
    <div className="relative w-full max-w-[440px]" aria-hidden="true">
      <div
        className="relative overflow-hidden rounded-[var(--radius-xl,24px)] p-6 text-white shadow-[var(--shadow-lg)]"
        style={{ background: 'var(--hero-bg)' }}
      >
        <div className="text-overline uppercase" style={{ color: 'var(--hero-overline)' }}>
          {t('landing.preview.balance')}
        </div>
        <div className="mt-1 whitespace-nowrap text-display font-bold tabular-nums">$17.411.300</div>
        <div className="mt-1 text-body-sm" style={{ color: 'var(--hero-overline)' }}>
          {t('landing.preview.wallets')}
        </div>
        <div className="mt-6 flex h-20 items-end gap-2">
          {PREVIEW_BARS.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md"
              style={{ height: `${h}%`, background: i === PREVIEW_BARS.length - 1 ? 'var(--hero-bar)' : 'var(--hero-bar-soft)' }}
            />
          ))}
        </div>
      </div>
      <div className="relative -mt-6 ml-6 mr-[-8px] rounded-[var(--radius-lg,16px)] border border-border bg-surface p-4 shadow-[var(--shadow-md)] min-[480px]:mr-[-24px]">
        <div className="mb-2 text-overline uppercase text-ink-tertiary">{t('landing.preview.recent')}</div>
        <ul className="flex flex-col">
          {rows.map((r) => (
            <li key={r.title} className="flex items-center gap-3 border-b border-divider py-2.5 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-title-sm font-semibold text-ink">{r.title}</div>
                <div className="truncate text-caption text-ink-tertiary">{r.meta}</div>
              </div>
              <div className={`shrink-0 whitespace-nowrap text-amount font-semibold tabular-nums ${r.positive ? 'text-positive' : 'text-ink'}`}>
                {r.amount}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-on-primary-soft">
      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
    </span>
  )
}

export default function LandingPage() {
  const { t } = useTranslation()
  const { enterGuest } = useAuth()
  const navigate = useNavigate()

  const onGuest = async () => {
    await enterGuest()
    navigate('/inicio', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-sm)] focus:bg-surface focus:px-4 focus:py-2 focus:text-label focus:text-link focus:shadow-[var(--shadow-md)]"
      >
        {t('landing.skip')}
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="S2 Nova" className="rounded-[var(--radius-sm)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            <Logo size="sm" />
          </Link>
          <nav className="flex items-center gap-2" aria-label={t('landing.navLabel')}>
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              {t('landing.login')}
            </Button>
            <Button size="sm" onClick={() => navigate('/register')}>
              {t('landing.register')}
            </Button>
          </nav>
        </div>
      </header>

      <main id="contenido">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pb-24 md:pt-20">
          <div className="flex flex-col items-start gap-6">
            <span className="rounded-full bg-accent-soft px-3 py-1 text-overline uppercase text-on-primary-soft">{t('brand.tagline')}</span>
            <h1 className="text-display font-extrabold text-balance">
              {t('landing.hero.title1')} <span className="text-link">{t('landing.hero.title2')}</span>
            </h1>
            <p className="max-w-[54ch] text-body text-ink-secondary">{t('landing.hero.body')}</p>
            <div className="flex w-full flex-col gap-3 min-[480px]:w-auto min-[480px]:flex-row">
              <Button size="lg" onClick={() => navigate('/register')} rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
                {t('landing.register')}
              </Button>
              <Button size="lg" variant="secondary" onClick={onGuest}>
                {t('landing.guest')}
              </Button>
            </div>
            <p className="text-caption text-ink-tertiary">{t('landing.guestNote')}</p>
          </div>
          <div className="flex justify-center md:justify-end">
            <HeroPreview />
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-border bg-bg-secondary" aria-labelledby="landing-features">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <div className="max-w-2xl">
              <h2 id="landing-features" className="text-headline font-bold text-balance">{t('landing.features.title')}</h2>
              <p className="mt-3 text-body text-ink-secondary">{t('landing.features.body')}</p>
            </div>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex flex-col gap-4 rounded-[var(--radius-lg,16px)] border border-border bg-surface p-6">
                  <IconTile icon={f.icon} />
                  <div>
                    <h3 className="text-title font-semibold">{t(f.title)}</h3>
                    <p className="mt-1.5 text-body-sm text-ink-secondary">{t(f.body)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Phone and computer */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24" aria-labelledby="landing-devices">
          <div className="max-w-2xl">
            <h2 id="landing-devices" className="text-headline font-bold text-balance">{t('landing.devices.title')}</h2>
            <p className="mt-3 text-body text-ink-secondary">{t('landing.devices.body')}</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              { icon: Smartphone, title: t('landing.phone.title'), body: t('landing.phone.body'), points: PHONE_POINTS },
              { icon: Monitor, title: t('landing.web.title'), body: t('landing.web.body'), points: WEB_POINTS },
            ].map((d) => (
              <div key={d.title} className="rounded-[var(--radius-lg,16px)] border border-border bg-surface p-6">
                <div className="flex items-center gap-3">
                  <IconTile icon={d.icon} />
                  <h3 className="text-title font-semibold">{d.title}</h3>
                </div>
                <p className="mt-3 text-body-sm text-ink-secondary">{d.body}</p>
                <ul className="mt-5 flex flex-col gap-3">
                  {d.points.map((p) => (
                    <li key={p.text} className="flex items-start gap-3 text-body-sm text-ink">
                      <p.icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-link" strokeWidth={2} aria-hidden="true" />
                      <span>{t(p.text)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section className="border-t border-border bg-bg-secondary" aria-labelledby="landing-trust">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <h2 id="landing-trust" className="max-w-2xl text-headline font-bold text-balance">{t('landing.trust.title')}</h2>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">
              {TRUST.map((x) => (
                <li key={x.title} className="flex gap-4">
                  <IconTile icon={x.icon} />
                  <div>
                    <h3 className="text-title-sm font-semibold">{t(x.title)}</h3>
                    <p className="mt-1 text-body-sm text-ink-secondary">{t(x.body)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24" aria-labelledby="landing-cta">
          <div className="flex flex-col items-start gap-6 rounded-[var(--radius-xl,24px)] border border-border bg-surface p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div className="max-w-xl">
              <h2 id="landing-cta" className="text-headline font-bold text-balance">{t('landing.cta.title')}</h2>
              <p className="mt-2 text-body text-ink-secondary">{t('landing.cta.body')}</p>
            </div>
            <div className="flex w-full flex-col gap-3 min-[480px]:w-auto min-[480px]:flex-row">
              <Button size="lg" onClick={() => navigate('/register')}>
                {t('landing.register')}
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                {t('landing.login')}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-8 text-caption text-ink-tertiary sm:flex-row sm:items-center sm:px-6">
          <Logo size="sm" />
          <span>© {new Date().getFullYear()} S2 Nova · {t('brand.tagline')}</span>
        </div>
      </footer>
    </div>
  )
}
