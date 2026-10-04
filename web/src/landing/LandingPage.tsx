import { useEffect, type ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  Coins,
  EyeOff,
  Fingerprint,
  FileSpreadsheet,
  HandCoins,
  Monitor,
  PiggyBank,
  ReceiptText,
  ScanBarcode,
  Smartphone,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { Logo, LogoMark } from '@/components/ui/Logo'
import { useAuth } from '@/state/AuthContext'
import { useTranslation } from '@/state/useTranslation'
import type { TranslationKey } from '@/lib/i18n/translations'
import { cn } from '@/lib/cn'

// Public front page for signed-out visitors at `/`. Neutral surfaces with
// the brand gradient kept to the primary action, the headline accent and
// the ambient glow; every illustration is aria-hidden sample data.

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

// Illustrative bars for the report card (relative heights, not data).
const REPORT_BARS = [38, 54, 46, 70, 58, 88, 64, 76, 52, 82, 68, 94]

const PILL = 'inline-flex h-12 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 text-body-sm font-semibold'
const PILL_OUTLINE = cn(PILL, 'border border-border-input bg-surface/60 text-ink transition-colors hover:bg-surface')

function IconTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={cn('inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-border bg-bg-secondary text-link', className)}>
      <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
    </span>
  )
}

// The hero's product composition: a balance panel with a trend line and
// two recent rows, plus two floating cards (barcode capture, reports).
function HeroComposition() {
  const { t } = useTranslation()
  const rows: { title: string; meta: string; amount: string; positive?: boolean; icon: LucideIcon }[] = [
    { title: t('landing.preview.row2'), meta: t('landing.preview.row2Meta'), amount: '+$3.200.000', positive: true, icon: Coins },
    { title: t('landing.preview.row1'), meta: t('landing.preview.row1Meta'), amount: '−$168.500', icon: ReceiptText },
  ]
  return (
    <div className="relative mx-auto h-[520px] w-full max-w-[540px]" aria-hidden="true">
      {/* Balance panel */}
      <div className="absolute left-1/2 top-1/2 w-[92%] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-border bg-surface/80 p-6 shadow-[var(--shadow-lg)] backdrop-blur-xl nova-rise [animation-delay:150ms]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-body-sm font-medium text-ink-secondary">{t('landing.preview.balance')}</div>
            <div className="mt-1 whitespace-nowrap text-[40px] font-light leading-none tracking-[-.035em] tabular-nums text-ink">$17.411.300</div>
            <div className="mt-2 text-caption text-ink-tertiary">{t('landing.preview.wallets')}</div>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-secondary text-ink-secondary">
            <EyeOff className="h-4 w-4" strokeWidth={1.8} />
          </span>
        </div>
        <svg className="mt-5 h-20 w-full" viewBox="0 0 100 30" preserveAspectRatio="none">
          <defs>
            <linearGradient id="landing-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#A80FFA" />
              <stop offset="55%" stopColor="#0047F5" />
              <stop offset="100%" stopColor="#00C4FB" />
            </linearGradient>
            <linearGradient id="landing-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0047F5" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0047F5" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,30 L0,18 C10,18 15,25 25,21 C35,17 40,8 50,11 C60,14 65,21 75,17 C85,13 90,6 100,3 L100,30 Z" fill="url(#landing-fill)" />
          <path d="M0,18 C10,18 15,25 25,21 C35,17 40,8 50,11 C60,14 65,21 75,17 C85,13 90,6 100,3" fill="none" stroke="url(#landing-line)" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-4 text-overline uppercase tracking-[.08em] text-ink-tertiary">{t('landing.preview.recent')}</div>
        <ul className="mt-2 flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.title} className="flex items-center gap-3 rounded-[14px] border border-border bg-bg-secondary/70 px-3 py-2.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border bg-surface text-ink-secondary">
                <r.icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-label font-semibold text-ink">{r.title}</div>
                <div className="truncate text-caption text-ink-tertiary">{r.meta}</div>
              </div>
              <div className={cn('shrink-0 whitespace-nowrap text-label font-semibold tabular-nums', r.positive ? 'text-positive' : 'text-negative')}>{r.amount}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* Floating: barcode capture */}
      <div className="absolute right-0 top-[4%] hidden w-[230px] rounded-[18px] border border-border bg-surface/85 p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl nova-rise [animation-delay:350ms] min-[560px]:block">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent-soft text-on-primary-soft">
            <ScanBarcode className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
          <span className="text-label font-semibold leading-tight text-ink">{t('landing.phone.title')}</span>
        </div>
        <p className="mt-2 text-caption leading-snug text-ink-secondary">{t('landing.phone.p3')}</p>
      </div>

      {/* Floating: reports */}
      <div className="absolute bottom-[2%] left-0 hidden w-[250px] rounded-[18px] border border-border bg-surface/85 p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl nova-rise [animation-delay:500ms] min-[560px]:block">
        <div className="flex items-center justify-between">
          <span className="text-label font-semibold text-ink">{t('landing.f.reports')}</span>
          <FileSpreadsheet className="h-4 w-4 text-ink-tertiary" strokeWidth={1.8} />
        </div>
        <div className="mt-3 flex h-12 items-end gap-1.5">
          {[40, 62, 34, 84, 52, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-[4px]" style={{ height: `${h}%`, background: i === 3 ? 'var(--hero-bar)' : 'var(--hero-bar-soft)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function BentoCard({ children, className }: { children: ReactNode; className?: string }) {
  return <li className={cn('nova-card relative flex flex-col overflow-hidden p-7 transition-colors hover:border-border-strong', className)}>{children}</li>
}

function FeatureText({ icon, title, body }: { icon: LucideIcon; title: TranslationKey; body: TranslationKey }) {
  const { t } = useTranslation()
  return (
    <div>
      <IconTile icon={icon} />
      <h3 className="mt-5 text-title font-medium tracking-[-.01em]">{t(title)}</h3>
      <p className="mt-2 max-w-[44ch] text-body-sm text-ink-secondary">{t(body)}</p>
    </div>
  )
}

export default function LandingPage() {
  const { t } = useTranslation()
  const { enterGuest } = useAuth()
  const navigate = useNavigate()

  // Sections below the hero reveal once as they scroll into view.
  useEffect(() => {
    const items = document.querySelectorAll('.nova-reveal')
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'))
      return
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const onGuest = async () => {
    await enterGuest()
    navigate('/inicio', { replace: true })
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-bg text-ink">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-sm)] focus:bg-surface focus:px-4 focus:py-2 focus:text-label focus:text-link focus:shadow-[var(--shadow-md)]"
      >
        {t('landing.skip')}
      </a>

      {/* Ambient brand glow */}
      <div aria-hidden="true" className="pointer-events-none absolute left-[-10%] top-[-12%] h-[620px] w-[620px] rounded-full bg-[#a80ffa]/12 blur-[140px]" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[-12%] top-[18%] h-[560px] w-[560px] rounded-full bg-[#00c4fb]/10 blur-[140px]" />

      <header className="sticky top-0 z-40 border-b border-border bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="S2 Nova" className="flex-none rounded-[var(--radius-sm)]">
            <LogoMark size="sm" className="min-[520px]:hidden" />
            <Logo size="sm" className="max-[519px]:hidden" />
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-3" aria-label={t('landing.navLabel')}>
            <button type="button" onClick={() => navigate('/login')} className="h-10 cursor-pointer whitespace-nowrap rounded-full px-3 text-label font-medium text-ink-secondary transition-colors hover:text-ink sm:px-4">
              {t('landing.login')}
            </button>
            <button type="button" onClick={() => navigate('/register')} className="btn-cta h-10 cursor-pointer whitespace-nowrap rounded-full px-5 text-label font-semibold">
              {t('landing.register')}
            </button>
          </nav>
        </div>
      </header>

      <main id="contenido" className="relative">
        {/* Hero */}
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-28 lg:pt-20">
          <div className="nova-rise flex flex-col items-start gap-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-label font-medium text-ink-secondary backdrop-blur">
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: 'var(--brand-bar)' }} />
              {t('brand.tagline')}
            </span>
            <h1 className="text-[clamp(44px,6.2vw,76px)] font-semibold leading-[1.04] tracking-[-.045em] text-balance">
              {t('landing.hero.title1')} <span className="text-brand-gradient">{t('landing.hero.title2')}</span>
            </h1>
            <p className="max-w-[52ch] text-[18px] leading-relaxed text-ink-secondary">{t('landing.hero.body')}</p>
            <div className="flex w-full flex-col gap-3 min-[480px]:w-auto min-[480px]:flex-row">
              <button type="button" onClick={() => navigate('/register')} className={cn(PILL, 'btn-cta')}>
                {t('landing.register')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={onGuest} className={PILL_OUTLINE}>
                {t('landing.guest')}
              </button>
            </div>
            <p className="flex items-center gap-2 text-caption text-ink-tertiary">
              <Check className="h-4 w-4 text-positive" strokeWidth={2.2} aria-hidden="true" />
              {t('landing.guestNote')}
            </p>
          </div>
          <HeroComposition />
        </section>

        {/* Phone and computer */}
        <section className="relative border-y border-border bg-bg-secondary/70" aria-labelledby="landing-devices">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="nova-reveal mx-auto max-w-2xl text-center">
              <h2 id="landing-devices" className="text-[clamp(32px,4vw,48px)] font-semibold leading-[1.1] tracking-[-.035em] text-balance">{t('landing.devices.title')}</h2>
              <p className="mt-4 text-body text-ink-secondary">{t('landing.devices.body')}</p>
            </div>
            <div className="nova-reveal mt-14 grid gap-5 md:grid-cols-2 lg:gap-8">
              {[
                { icon: Smartphone, title: t('landing.phone.title'), body: t('landing.phone.body'), points: PHONE_POINTS },
                { icon: Monitor, title: t('landing.web.title'), body: t('landing.web.body'), points: WEB_POINTS },
              ].map((d) => (
                <div key={d.title} className="nova-card relative overflow-hidden p-8 lg:p-10">
                  <d.icon aria-hidden="true" className="pointer-events-none absolute right-6 top-6 h-24 w-24 text-ink opacity-[.05]" strokeWidth={1.2} />
                  <IconTile icon={d.icon} />
                  <h3 className="mt-6 text-headline font-medium tracking-[-.02em]">{d.title}</h3>
                  <p className="mt-2 text-body text-ink-secondary">{d.body}</p>
                  <ul className="mt-7 flex flex-col gap-4">
                    {d.points.map((p) => (
                      <li key={p.text} className="flex items-start gap-3 text-body-sm text-ink">
                        <span className="mt-px flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent-soft text-on-primary-soft">
                          <p.icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                        </span>
                        <span>{t(p.text)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features, bento */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28" aria-labelledby="landing-features">
          <div className="nova-reveal max-w-2xl">
            <h2 id="landing-features" className="text-[clamp(32px,4vw,48px)] font-semibold leading-[1.1] tracking-[-.035em] text-balance">{t('landing.features.title')}</h2>
            <p className="mt-4 text-body text-ink-secondary">{t('landing.features.body')}</p>
          </div>
          <ul className="nova-reveal mt-14 grid gap-4 md:grid-cols-3 lg:gap-5">
            {/* Wallets and currencies, 2×2 */}
            <BentoCard className="justify-between md:col-span-2 md:row-span-2">
              <FeatureText icon={Coins} title="landing.f.currencies" body="landing.f.currenciesBody" />
              <div aria-hidden="true" className="relative mt-10 h-64">
                <div className="absolute bottom-16 right-[min(52%,300px)] flex h-40 w-72 -rotate-6 flex-col justify-between rounded-[20px] border border-border bg-bg-secondary p-5 shadow-[var(--shadow-md)]">
                  <div className="flex justify-between text-caption font-semibold text-ink-tertiary">
                    <span>Wise</span>
                    <span>USD</span>
                  </div>
                  <div className="text-[24px] font-light tracking-[-.03em] tabular-nums text-ink-secondary">US$2.450,00</div>
                </div>
                <div className="absolute bottom-2 right-2 flex h-44 w-80 rotate-2 flex-col justify-between rounded-[20px] border border-border-strong bg-surface p-6 shadow-[var(--shadow-lg)]">
                  <div className="flex items-start justify-between">
                    <span className="text-label font-semibold text-ink">Bancolombia</span>
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-caption font-semibold text-on-primary-soft">COP</span>
                  </div>
                  <div>
                    <div className="text-caption text-ink-tertiary">{t('landing.preview.balance')}</div>
                    <div className="text-[30px] font-light tracking-[-.03em] tabular-nums text-ink">$8.240.000</div>
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* Goals */}
            <BentoCard>
              <div aria-hidden="true" className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-surface-sunken)" strokeWidth="9" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="url(#landing-line)" strokeWidth="9" strokeLinecap="round" strokeDasharray="264" strokeDashoffset="74" />
                </svg>
                <span className="absolute text-title-sm font-semibold tabular-nums">72 %</span>
              </div>
              <FeatureText icon={Target} title="landing.f.goals" body="landing.f.goalsBody" />
            </BentoCard>

            {/* Budgets */}
            <BentoCard>
              <FeatureText icon={PiggyBank} title="landing.f.budgets" body="landing.f.budgetsBody" />
              <div aria-hidden="true" className="mt-6 flex flex-col gap-3">
                {[
                  { w: 64, c: 'var(--color-positive)' },
                  { w: 92, c: 'var(--color-negative)' },
                ].map((b, i) => (
                  <div key={i} className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                    <div className="h-full rounded-full" style={{ width: `${b.w}%`, background: b.c }} />
                  </div>
                ))}
              </div>
            </BentoCard>

            {/* Loans, 2 wide */}
            <BentoCard className="md:col-span-2 md:flex-row md:items-center md:gap-10">
              <div className="flex-1">
                <FeatureText icon={HandCoins} title="landing.f.loans" body="landing.f.loansBody" />
              </div>
              <div aria-hidden="true" className="mt-6 flex-1 rounded-[16px] border border-border bg-bg-secondary p-5 md:mt-0">
                <div className="flex justify-between text-caption text-ink-tertiary">
                  <span>{t('landing.f.loans')}</span>
                  <span className="font-semibold tabular-nums text-ink">$1.200.000</span>
                </div>
                <div className="mt-3 flex h-2 gap-1">
                  <div className="h-full w-1/4 rounded-l-full bg-[#a80ffa]" />
                  <div className="h-full w-1/4 bg-[#0047f5]" />
                  <div className="h-full w-1/4 bg-surface-sunken" />
                  <div className="h-full w-1/4 rounded-r-full bg-surface-sunken" />
                </div>
                <div className="mt-2 text-caption tabular-nums text-ink-tertiary">50 %</div>
              </div>
            </BentoCard>

            {/* Movements */}
            <BentoCard>
              <FeatureText icon={ReceiptText} title="landing.f.movements" body="landing.f.movementsBody" />
            </BentoCard>

            {/* Reports, full width */}
            <BentoCard className="md:col-span-3 md:flex-row md:items-end md:gap-12">
              <div className="md:w-[38%]">
                <FeatureText icon={BarChart3} title="landing.f.reports" body="landing.f.reportsBody" />
              </div>
              <div aria-hidden="true" className="mt-8 flex h-36 flex-1 items-end gap-2 md:mt-0">
                {REPORT_BARS.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-[6px] rounded-b-[2px]"
                    style={{ height: `${h}%`, background: i === REPORT_BARS.length - 1 ? 'var(--hero-bar)' : 'var(--hero-bar-soft)' }}
                  />
                ))}
              </div>
            </BentoCard>
          </ul>
        </section>

        {/* Privacy */}
        <section className="border-t border-border bg-bg-secondary/70" aria-labelledby="landing-trust">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
            <h2 id="landing-trust" className="nova-reveal max-w-2xl text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.15] tracking-[-.03em] text-balance">{t('landing.trust.title')}</h2>
            <ul className="nova-reveal mt-12 grid gap-5 md:grid-cols-3">
              {TRUST.map((x) => (
                <li key={x.title} className="nova-card flex flex-col gap-5 p-7">
                  <IconTile icon={x.icon} />
                  <div>
                    <h3 className="text-title-sm font-semibold">{t(x.title)}</h3>
                    <p className="mt-1.5 text-body-sm text-ink-secondary">{t(x.body)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="relative overflow-hidden" aria-labelledby="landing-cta">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0047f5]/10 blur-[120px]" />
          <div className="nova-reveal relative mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:py-32">
            <h2 id="landing-cta" className="text-[clamp(36px,5vw,60px)] font-semibold leading-[1.05] tracking-[-.04em] text-balance">{t('landing.cta.title')}</h2>
            <p className="mt-5 max-w-xl text-[18px] text-ink-secondary">{t('landing.cta.body')}</p>
            <div className="mt-10 flex w-full flex-col justify-center gap-3 min-[480px]:w-auto min-[480px]:flex-row">
              <button type="button" onClick={() => navigate('/register')} className={cn(PILL, 'btn-cta h-14 px-9')}>
                {t('landing.register')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => navigate('/login')} className={cn(PILL_OUTLINE, 'h-14 px-9')}>
                {t('landing.login')}
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-10 text-caption text-ink-tertiary sm:flex-row sm:items-center sm:px-6">
          <Logo size="sm" />
          <span>© {new Date().getFullYear()} S2 Nova · {t('brand.tagline')}</span>
        </div>
      </footer>
    </div>
  )
}
