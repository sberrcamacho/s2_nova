import { StrokeIcon } from '@/components/v2/icons'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logoMarkDark from '@/assets/logo-mark-dark.png'
import { AmountField, Flat, Label, TextInput } from '@/components/v2/Kit'
import { evalExpr } from '@/lib/nuevoMovimiento'
import { WALLET_KINDS, walletKindLabel } from '@/dashboard/components/WalletModal'
import { fill, tr } from '@/lib/i18n/translations'
import { currencyName } from '@/lib/currency'
import { cn } from '@/lib/cn'
import { currencyInfo, deviceRegion } from '@/lib/currency'
import { accountService } from '@/services/accountService'
import { currencyService } from '@/services/currencyService'
import { userService } from '@/services/userService'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'
import type { AccountType } from '@/types'

const CODES = ['COP', 'USD', 'EUR', 'MXN', 'PEN']

// First run (ONBOARDING.md §2): Crear cuenta › moneda principal › primera
// billetera › Inicio. Not skippable, so the user never lands in the app
// without a wallet. The principal can only be set while there are no
// wallets, hence it is saved together with the wallet at the end.
export default function FirstRunPage() {
  const { user, updateUser, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const region = deviceRegion()
  const [step, setStep] = useState(0)
  const [principal, setPrincipal] = useState(region.currency)
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('SAVINGS')
  const [digits, setDigits] = useState('')
  const [busy, setBusy] = useState(false)

  // An older account that already has wallets never saw this flow: just
  // mark it done instead of asking for a first wallet it doesn't need.
  useEffect(() => {
    accountService.getWallets().then(
      (wallets) => {
        if (!wallets.length) return
        updateUser({ onboardingCompleted: true })
        void userService.completeOnboarding().catch(() => undefined)
        navigate('/inicio', { replace: true })
      },
      () => undefined,
    )
  }, [updateUser, navigate])

  const codes = CODES.includes(region.currency) ? CODES : [region.currency, ...CODES]
  const cur = currencyInfo(principal)
  const valid = step === 0 || !!name.trim()

  const back = () => {
    if (step === 1) return setStep(0)
    logout() // ProtectedRoute sends a signed-out /bienvenida back to /register
  }

  const next = async () => {
    if (!valid || busy) return
    if (step === 0) return setStep(1)
    setBusy(true)
    try {
      if (principal !== user?.principalCurrency) await currencyService.setPrincipal(principal)
      await accountService.createWallet({ name: name.trim(), type, initialBalance: evalExpr(digits), currency: principal })
      await userService.completeOnboarding()
      updateUser({ principalCurrency: principal, currency: principal, onboardingCompleted: true })
      navigate('/inicio', { replace: true })
    } catch {
      setBusy(false)
      showToast(tr('first.err'), 'error')
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg p-4 text-ink [line-height:normal] min-[640px]:p-10">
      <div className="flex w-[578px] max-w-full flex-col gap-[22px] rounded-[20px] border border-border bg-surface p-5 min-[640px]:p-7">
        <div className="flex items-center gap-3.5">
          <button type="button" onClick={back} aria-label={tr('common.back')} className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-border-input text-ink hover:bg-surface-sunken">
            <StrokeIcon paths="M19 12H5 M11 6l-6 6 6 6" size={18} />
          </button>
          <div className="flex flex-1 gap-1.5">
            {[0, 1].map((i) => (
              <span key={i} className={cn('h-1 flex-1 rounded-full', i <= step ? '[background:var(--cta-bg)]' : 'bg-border')} />
            ))}
          </div>
          <img src={logoMarkDark} alt="S2 Nova" className="h-[30px] w-[30px] rounded-[9px] object-cover" />
        </div>

        <div>
          <div className="text-overline font-semibold uppercase text-link">{fill(tr('first.step'), step + 1)}</div>
          <h1 className="mt-2 text-headline font-bold">{tr(step === 1 ? 'first.wallet.title' : 'first.currency.title')}</h1>
          <div className="mt-2 text-body-sm text-ink-secondary [text-wrap:pretty]">
            {tr(step === 1 ? 'first.wallet.body' : 'first.currency.body')}
          </div>
        </div>

        {step === 0 ? (
          <div role="radiogroup" aria-label={tr('first.currency.label')} className="flex flex-col gap-2">
            {codes.map((code) => {
              const on = principal === code
              const c = currencyInfo(code)
              return (
                <div
                  key={code}
                  role="radio"
                  aria-checked={on}
                  tabIndex={0}
                  onClick={() => setPrincipal(code)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setPrincipal(code)}
                  className={cn('flex min-h-14 cursor-pointer items-center gap-3 rounded-[14px] border px-3.5 py-2.5', on ? 'border-primary-border bg-accent-soft' : 'border-border-input bg-transparent hover:bg-surface-sunken')}
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-accent-soft text-caption font-bold text-on-primary-soft">{c.symbol}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-title-sm font-semibold">{`${currencyName(code, c.name)} · ${code}`}</div>
                    {code === region.currency && <div className="text-body-sm text-link">{fill(tr('first.detected'), region.country)}</div>}
                  </div>
                  <span className={cn('h-5 w-5 flex-none rounded-full border-2', on ? 'border-primary-border bg-primary-border shadow-[inset_0_0_0_3px_var(--color-surface)]' : 'border-border-input bg-transparent')} />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{tr('bud.name')}</Label>
              <TextInput value={name} onChange={setName} placeholder={tr('first.namePh')} autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{tr('wallet.type')}</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr('wallet.type')}>
                {WALLET_KINDS.map((k) => (
                  <Flat key={k.type} role="radio" on={type === k.type} onClick={() => setType(k.type)}>
                    {walletKindLabel(k.type)}
                  </Flat>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{tr('wallet.currency')}</Label>
              <div className="flex h-11 items-center gap-2.5 rounded-[8px] border border-border bg-surface-sunken px-3 text-body-sm font-semibold">
                <span className="text-link">{cur.symbol}</span>
                {`${currencyName(principal, cur.name)} · ${principal}`}
              </div>
              <div className="text-caption text-ink-secondary">{tr('first.otherCurrencies')}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{tr('wallet.balance')}</Label>
              <AmountField expr={digits} onExpr={setDigits} symbol={cur.symbol} label={tr('first.initialBalance')} />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => void next()}
          disabled={!valid || busy}
          className={cn('btn-cta flex h-11 items-center justify-center rounded-full text-label font-semibold', valid ? 'cursor-pointer' : 'cursor-not-allowed opacity-40')}
        >
          {tr(step === 1 ? 'first.create' : 'kit.continue')}
        </button>
      </div>
    </div>
  )
}
