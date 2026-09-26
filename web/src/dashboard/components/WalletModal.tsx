import { useEffect, useState } from 'react'
import { CancelButton, ConfirmDialog, DangerLink, Field, Flat, Label, ModalFooter, ModalTitle, MoneyInput, SaveButton, TextInput, V2Modal } from '@/components/v2/Kit'
import { currencyInfo, formatMoney } from '@/lib/currency'
import { accountService } from '@/services/accountService'
import { currencyService } from '@/services/currencyService'
import { useCurrency } from '@/state/useCurrency'
import { useToast } from '@/state/ToastContext'
import type { AccountType, Wallet } from '@/types'

// The mockup's WALLET_KINDS and the wallet type each one saves (same
// mapping as Android's WalletKind).
export const WALLET_KINDS: { label: string; type: AccountType }[] = [
  { label: 'Cuenta de ahorros', type: 'SAVINGS' },
  { label: 'Cuenta corriente', type: 'BANK_DEBIT' },
  { label: 'Nequi', type: 'NEQUI' },
  { label: 'Daviplata', type: 'DAVIPLATA' },
  { label: 'Tarjeta de crédito', type: 'BANK_CREDIT' },
  { label: 'Efectivo', type: 'CASH' },
]

export function walletKindLabel(type: AccountType): string {
  return (WALLET_KINDS.find((k) => k.type === type) ?? WALLET_KINDS[0]).label
}

// Mockup wIcon: bills for cash, a phone for Nequi/Daviplata, a card for
// credit, a bank otherwise.
export function walletGlyph(type: AccountType): string[] {
  if (type === 'CASH') return ['M2 6h20v12H2z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z']
  if (type === 'NEQUI' || type === 'DAVIPLATA') return ['M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z', 'M11 18h2']
  if (type === 'BANK_CREDIT') return ['M2 6h20v12H2z', 'M2 10h20', 'M6 14h4']
  return ['M3 10h18', 'M5 10v8', 'M9.5 10v8', 'M14.5 10v8', 'M19 10v8', 'M3 21h18', 'M12 3l9 5H3z']
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
  const [digits, setDigits] = useState(wallet ? String(Math.trunc(wallet.currentBalance)) : '')
  const [codes, setCodes] = useState<string[]>([principal])
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
      else await accountService.createWallet({ name: name.trim(), type, initialBalance: Number(digits) || 0, currency })
      showToast('Billetera guardada', 'success')
      onSaved()
    } catch {
      showToast('No se pudo guardar la billetera.', 'error')
      setBusy(false)
    }
  }

  const askDelete = () => {
    if (wallets.length <= 1) return showToast('Necesitas al menos una billetera para usar S2 Nova.', 'error')
    setConfirming(true)
  }

  const remove = async () => {
    if (!wallet) return
    setConfirming(false)
    try {
      await accountService.deleteWallet(wallet.id)
      onSaved()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo eliminar la billetera.', 'error')
    }
  }

  const n = wallet?.movements ?? 0
  return (
    <V2Modal width={460} onClose={onClose} label={editing ? 'Editar billetera' : 'Nueva billetera'}>
      <ModalTitle>{editing ? 'Editar billetera' : 'Nueva billetera'}</ModalTitle>
      <Field label="NOMBRE">
        <TextInput value={name} onChange={setName} placeholder="Nequi, Bancolombia — Ahorros…" autoFocus={!editing} />
      </Field>
      <div className="flex flex-col gap-2">
        <Label>TIPO</Label>
        <div className="flex flex-wrap gap-1.5">
          {WALLET_KINDS.map((k) => (
            <Flat key={k.type} on={type === k.type} onClick={() => setType(k.type)}>
              {k.label}
            </Flat>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>MONEDA</Label>
        <div className="flex flex-wrap gap-1.5">
          {(codes.includes(currency) ? codes : [...codes, currency]).map((c) => (
            <Flat key={c} on={currency === c} onClick={() => !editing && setCurrency(c)}>
              {c}
            </Flat>
          ))}
        </div>
        <div className="text-[11px] text-v2-dim">
          El saldo se lleva en {currencyInfo(currency).name.toLowerCase()}. Los movimientos en otra moneda se convierten al registrarlos.
        </div>
      </div>
      <Field label="SALDO ACTUAL">
        <MoneyInput digits={digits} onDigits={(d) => !editing && setDigits(d)} symbol={currencyInfo(currency).symbol} />
      </Field>
      <ModalFooter left={editing && <DangerLink onClick={askDelete}>Eliminar billetera</DangerLink>}>
        <CancelButton onClick={onClose} />
        <SaveButton valid={valid} busy={busy} onClick={() => void save()} />
      </ModalFooter>
      {confirming && wallet && (
        <ConfirmDialog
          title={`Eliminar la billetera “${wallet.name}”`}
          lines={[
            `Saldo actual: ${formatMoney(wallet.currentBalance, wallet.currency)}`,
            `${n}${n === 1 ? ' movimiento asociado se elimina' : ' movimientos asociados se eliminan'} con ella`,
            'El saldo total de Inicio se recalcula',
          ]}
          ack={`Entiendo que se eliminan la billetera y sus ${n} movimientos.`}
          cta="Eliminar billetera"
          onCancel={() => setConfirming(false)}
          onConfirm={() => void remove()}
        />
      )}
    </V2Modal>
  )
}
