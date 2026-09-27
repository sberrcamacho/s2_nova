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
    <div className="flex min-h-screen w-full items-center justify-center bg-v2-bg p-10 text-v2-text [line-height:normal]">
      <div className="flex w-[578px] max-w-full flex-col gap-[22px] rounded-[22px] border border-v2-line bg-v2-surface p-7">
        <div className="flex items-center gap-3.5">
          <button type="button" onClick={back} aria-label={tr('common.back')} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-v2-line2 text-v2-muted">
            ←
          </button>
          <div className="flex flex-1 gap-1.5">
            {[0, 1].map((i) => (
              <span key={i} className={cn('h-[3px] flex-1 rounded-[2px]', i <= step ? 'bg-v2-accent' : 'bg-v2-line2')} />
            ))}
          </div>
          <img src={logoMarkDark} alt="S2 Nova" className="h-[30px] w-[30px] rounded-[9px] object-cover" />
        </div>

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.12em] text-v2-accent2">{fill(tr('first.step'), step + 1)}</div>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-[-.025em]">{tr(step === 1 ? 'first.wallet.title' : 'first.currency.title')}</h1>
          <div className="mt-2 text-[13px] leading-[1.5] text-v2-muted [text-wrap:pretty]">
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
                  className={cn('flex cursor-pointer items-center gap-3 rounded-[14px] border px-3.5 py-3', on ? 'border-v2-accent bg-[rgba(108,92,231,.12)]' : 'border-v2-line2 bg-transparent')}
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[rgba(108,92,231,.16)] text-[11.5px] font-extrabold text-v2-accent2">{c.symbol}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold">{`${currencyName(code, c.name)} · ${code}`}</div>
                    {code === region.currency && <div className="mt-[3px] text-[11px] font-bold text-v2-accent2">{fill(tr('first.detected'), region.country)}</div>}
                  </div>
                  <span className={cn('h-5 w-5 flex-none rounded-full border-2', on ? 'border-v2-accent bg-v2-accent shadow-[inset_0_0_0_2.5px_var(--v2-surface)]' : 'border-v2-line2 bg-transparent')} />
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
              <div className="flex flex-wrap gap-1.5">
                {WALLET_KINDS.map((k) => (
                  <Flat key={k.type} on={type === k.type} onClick={() => setType(k.type)}>
                    {walletKindLabel(k.type)}
                  </Flat>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{tr('wallet.currency')}</Label>
              <div className="flex h-[44px] items-center gap-2.5 rounded-[10px] border border-v2-line bg-v2-bg px-3 text-[13px] font-bold">
                <span className="text-v2-accent2">{cur.symbol}</span>
                {`${currencyName(principal, cur.name)} · ${principal}`}
              </div>
              <div className="text-[11px] text-v2-dim">{tr('first.otherCurrencies')}</div>
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
          className={cn('flex h-[46px] items-center justify-center rounded-[12px] text-[14px] font-extrabold', valid ? 'cursor-pointer bg-v2-accent text-white' : 'cursor-not-allowed bg-v2-surface2 text-v2-dim')}
        >
          {tr(step === 1 ? 'first.create' : 'kit.continue')}
        </button>
      </div>
    </div>
  )
}
