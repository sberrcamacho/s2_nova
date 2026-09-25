import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AjActions, AjCard, AjCardTitle, AjField, AjOutlineButton, AjSubHeader } from '@/dashboard/components/ajustes/AjustesUi'
import { ApiError } from '@/lib/apiClient'
import { counted } from '@/lib/ajustes'
import { fill } from '@/lib/inicio'
import { userService, type Footprint } from '@/services/userService'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { cn } from '@/lib/cn'

const CONFIRM_WORD = 'ELIMINAR'

// Ajustes › Eliminar cuenta: what gets erased (counted by the backend), a
// CSV copy, and the confirmation (the word, the password, the checkbox).
export default function EliminarPage() {
  const { logout } = useAuth()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [footprint, setFootprint] = useState<Footprint | null>(null)
  const [word, setWord] = useState('')
  const [password, setPassword] = useState('')
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    userService.getFootprint().then(setFootprint, () => setFootprint(null))
  }, [])

  const canDelete = word.trim().toUpperCase() === CONFIRM_WORD && password.length > 0 && ack

  const fail = (err: unknown) => showToast(err instanceof Error ? err.message : 'Algo salió mal. Intenta de nuevo.', 'error')

  const exportData = () => userService.exportData().then(() => showToast(t('aj.del.exported'), 'success'), fail)

  const remove = async () => {
    if (!canDelete || busy) return
    setBusy(true)
    try {
      await userService.deleteAccount(password)
      logout()
      navigate('/login', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) showToast(t('aj.pw.errWrong'), 'error')
      else if (err instanceof ApiError && err.status === 409) showToast(t('aj.del.noPassword'), 'error')
      else fail(err)
      setBusy(false)
    }
  }

  const lines = footprint
    ? [
        fill(t('aj.del.movements'), counted(footprint.transactions, 'aj.del.n.movement', t)),
        fill(t('aj.del.plans'), counted(footprint.budgets, 'aj.del.n.budget', t), counted(footprint.goals, 'aj.del.n.goal', t), counted(footprint.loans, 'aj.del.n.loan', t)),
        fill(t('aj.del.wallets'), counted(footprint.wallets, 'aj.del.n.wallet', t)),
        t('aj.del.profile'),
      ]
    : [t('aj.del.profile')]

  return (
    <div className="flex max-w-[676px] flex-col gap-[18px] px-7 pt-[26px] pb-10">
      <AjSubHeader title={t('aj.deleteAccount')} subtitle={t('aj.del.subtitle')} danger />

      <AjCard className="flex flex-col gap-3 p-[22px]" style={{ borderColor: 'rgba(255,98,98,.3)' }}>
        <AjCardTitle>{t('aj.del.what')}</AjCardTitle>
        {lines.map((line) => (
          <div key={line} className="flex items-center gap-2.5 text-[12.5px]">
            <span className="h-1.5 w-1.5 flex-none rounded-full bg-v2-neg" />
            {line}
          </div>
        ))}
        <div className="mt-1 flex items-center gap-4 border-t border-v2-subtle pt-3">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold">{t('aj.del.copy')}</div>
            <div className="mt-0.5 text-[11.5px] text-v2-dim">{t('aj.del.copyHint')}</div>
          </div>
          <AjOutlineButton onClick={exportData}>{t('aj.del.export')}</AjOutlineButton>
        </div>
      </AjCard>

      <AjCard className="flex flex-col gap-4 p-[22px]">
        <AjField label={t('aj.del.confirm')} type="text" autoComplete="off" value={word} onChange={(e) => setWord(e.target.value)} placeholder={CONFIRM_WORD} />
        <AjField label={t('aj.del.password')} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <button type="button" role="checkbox" aria-checked={ack} onClick={() => setAck((v) => !v)} className="flex cursor-pointer items-center gap-2.5 text-left text-[12.5px]">
          <span
            className={cn(
              'box-border flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border-[1.5px] text-white',
              ack ? 'border-v2-neg bg-v2-neg' : 'border-v2-line2 bg-transparent',
            )}
          >
            {ack && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </span>
          <span>{t('aj.del.ack')}</span>
        </button>
        <AjActions onCancel={() => navigate('/ajustes')} submitLabel={t('aj.del.submit')} onSubmit={remove} submitClassName="bg-v2-neg" disabled={!canDelete} />
      </AjCard>
    </div>
  )
}
