import { useEffect, useState } from 'react'
import { evalExpr, numStr } from '@/lib/nuevoMovimiento'
import { CancelButton, ConfirmDialog, DangerLink, Flat, Icon, Label, ModalFooter, ModalTitle, SaveButton, V2Modal } from '@/components/v2/Kit'
import { AmountHero, SegmentedChoice, StepNote } from '@/components/v2/Steps'
import { currencyInfo, formatMoney } from '@/lib/currency'
import { accountService } from '@/services/accountService'
import { currencyService } from '@/services/currencyService'
import { useCurrency } from '@/state/useCurrency'
import { useToast } from '@/state/ToastContext'
import type { AccountType, Wallet } from '@/types'
import { fill, tr, type TranslationKey } from '@/lib/i18n/translations'
import { currencyName } from '@/lib/currency'

// The mockup's WALLET_KINDS and the wallet type each one saves (same
// mapping as Android's WalletKind).
export const WALLET_KINDS: { type: AccountType }[] = [{ type: 'SAVINGS' }, { type: 'BANK_DEBIT' }, { type: 'NEQUI' }, { type: 'DAVIPLATA' }, { type: 'BANK_CREDIT' }, { type: 'CASH' }]

const KIND_KEYS: Partial<Record<AccountType, TranslationKey>> = {
  SAVINGS: 'wallet.kind.savings',
  BANK_DEBIT: 'wallet.kind.checking',
  BANK_CREDIT: 'wallet.kind.credit',
  CASH: 'wallet.kind.cash',
}

// Nequi and Daviplata are brand names, the same in every language.
export function walletKindLabel(type: AccountType): string {
  if (type === 'NEQUI') return 'Nequi'
  if (type === 'DAVIPLATA') return 'Daviplata'
  return tr(KIND_KEYS[type] ?? 'wallet.kind.savings')
}

// Mockup wIcon: bills for cash, a phone for Nequi/Daviplata, a card for
// credit, a bank otherwise.
export function walletGlyph(type: AccountType): string[] {
  if (type === 'CASH') return ['M2 6h20v12H2z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z']
  if (type === 'NEQUI' || type === 'DAVIPLATA') return ['M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z', 'M11 18h2']
  if (type === 'BANK_CREDIT') return ['M2 6h20v12H2z', 'M2 10h20', 'M6 14h4']
  return ['M3 10h18', 'M5 10v8', 'M9.5 10v8', 'M14.5 10v8', 'M19 10v8', 'M3 21h18', 'M12 3l9 5H3z']
}

// guessWalletKind: the type suggested by the name (same table as Android).
const KEYWORDS: [AccountType, string[]][] = [
  ['NEQUI', ['nequi']],
  ['DAVIPLATA', ['daviplata', 'davi plata']],
  ['BANK_CREDIT', ['tarjeta', 'credito', 'crédito', 'visa', 'master', 'amex']],
  ['BANK_DEBIT', ['corriente']],
  ['SAVINGS', ['ahorro', 'bancolombia', 'davivienda', 'bbva', 'banco', 'cuenta', 'lulo', 'scotia', 'itau', 'itaú']],
  ['CASH', ['efectivo', 'caja', 'billetera', 'bolsillo', 'cash']],
]
export function guessWalletKind(name: string): AccountType | null {
  const n = name.toLowerCase().trim()
  if (!n) return null
  return KEYWORDS.find(([, keys]) => keys.some((k) => n.includes(k)))?.[0] ?? null
}

// Nueva / Editar billetera (CURRENCIES_AND_WALLETS.md §4). The backend
// fixes a wallet's currency and balance once created, so while editing
// (as on Android) only the name and the type change. Deleting uses the
// two-step confirmation; the last wallet can't be deleted.
export function WalletModal({ wallet, wallets, onClose, onSaved }: { wallet: Wallet | null; wallets: Wallet[]; onClose: () => void; onSaved: () => void }) {
  const { currency: principal } = useCurrency()
  const { showToast } = useToast()
  const [name, setName] = useState(wallet?.name ?? '')
  const [type, setType] = useState<AccountType>(wallet ? (WALLET_KINDS.some((k) => k.type === wallet.accountType) ? wallet.accountType : 'SAVINGS') : 'CASH')
  const [currency, setCurrency] = useState(wallet?.currency ?? principal)
  const [digits, setDigits] = useState(wallet ? numStr(wallet.currentBalance) : '')
  const [codes, setCodes] = useState<string[]>([principal])
  const [auto, setAuto] = useState(!wallet)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const editing = !!wallet
  const valid = !!name.trim()

  useEffect(() => {
    currencyService
      .getMine()
      .then((list) => setCodes(list.map((c) => c.code)))
      .catch(() => {})
  }, [])

  const save = async () => {
    if (!valid || busy) return
    setBusy(true)
    try {
      if (wallet) await accountService.updateWallet(wallet.id, { name: name.trim(), type })
      else await accountService.createWallet({ name: name.trim(), type, initialBalance: evalExpr(digits), currency })
      showToast(tr('wallet.toast.saved'), 'success')
      onSaved()
    } catch {
      showToast(tr('wallet.err.save'), 'error')
      setBusy(false)
    }
  }

  const askDelete = () => {
    if (wallets.length <= 1) return showToast(tr('api.lastWallet'), 'error')
    setConfirming(true)
  }

  const remove = async () => {
    if (!wallet) return
    setConfirming(false)
    try {
      await accountService.deleteWallet(wallet.id)
      onSaved()
    } catch (err) {
      showToast(err instanceof Error ? err.message : tr('wallet.err.delete'), 'error')
    }
  }

  const n = wallet?.movements ?? 0
  return (
    <V2Modal width={460} onClose={onClose} label={tr(editing ? 'wallet.edit' : 'wallet.new')}>
      <ModalTitle>{tr(editing ? 'wallet.edit' : 'wallet.new')}</ModalTitle>
      <div className="flex flex-col gap-1.5">
        <Label>{tr('bud.name')}</Label>
        <div className="flex h-14 items-center gap-2.5 rounded-[10px] border border-border-input bg-surface pr-3 pl-2 focus-within:border-primary-border">
          <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px]" style={{ background: 'linear-gradient(150deg,var(--color-primary-pressed),var(--color-primary-secondary))' }}>
            <Icon paths={walletGlyph(type)} size={18} color="#fff" />
          </span>
          <input
            autoFocus={!editing}
            value={name}
            aria-label={tr('bud.name')}
            onChange={(e) => {
              setName(e.target.value)
              const guess = auto ? guessWalletKind(e.target.value) : null
              if (guess) setType(guess)
            }}
            placeholder={tr('wallet.namePh')}
            className="min-w-0 flex-1 border-none bg-transparent text-body font-semibold text-ink outline-none placeholder:text-ink-tertiary"
          />
        </div>
        <div className="text-caption text-ink-secondary">{tr(auto && guessWalletKind(name) ? 'wallet.typeGuess' : 'wallet.typeHint')}</div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>{tr('wallet.type')}</Label>
        <div className="flex flex-col gap-2">
          {[0, 2, 4].map((i) => (
            <SegmentedChoice
              key={i}
              label={tr('wallet.type')}
              value={type}
              onChange={(v) => {
                setType(v)
                setAuto(false)
              }}
              options={WALLET_KINDS.slice(i, i + 2).map((k) => ({ value: k.type, label: walletKindLabel(k.type), icon: walletGlyph(k.type) }))}
            />
          ))}
        </div>
      </div>
      {wallet ? (
        <StepNote>{fill(tr('wallet.editNote'), formatMoney(wallet.currentBalance, wallet.currency))}</StepNote>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Label>{tr('wallet.currency')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {(codes.includes(currency) ? codes : [...codes, currency]).map((c) => (
                <Flat key={c} on={currency === c} onClick={() => setCurrency(c)}>
                  {c}
                </Flat>
              ))}
            </div>
            <div className="text-caption text-ink-secondary">{fill(tr('wallet.currencyHint'), currencyName(currency).toLowerCase())}</div>
          </div>
          <AmountHero label={tr('wallet.balanceLabel')} expr={digits} onExpr={setDigits} code={currency} symbol={currencyInfo(currency).symbol} />
        </>
      )}
      <ModalFooter left={editing && <DangerLink onClick={askDelete}>{tr('wallet.delete')}</DangerLink>}>
        <CancelButton onClick={onClose} />
        <SaveButton valid={valid} busy={busy} onClick={() => void save()} />
      </ModalFooter>
      {confirming && wallet && (
        <ConfirmDialog
          title={fill(tr('wallet.delete.title'), wallet.name)}
          lines={[fill(tr('wallet.delete.balance'), formatMoney(wallet.currentBalance, wallet.currency)), fill(tr(n === 1 ? 'wallet.delete.one' : 'wallet.delete.many'), n), tr('wallet.delete.total')]}
          ack={fill(tr('wallet.delete.ack'), n)}
          cta={tr('wallet.delete')}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void remove()}
        />
      )}
    </V2Modal>
  )
}
