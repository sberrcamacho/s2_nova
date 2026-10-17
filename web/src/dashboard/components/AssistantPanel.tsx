import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { SidePanel } from '@/components/panels/SidePanel'
import { ApiError } from '@/lib/apiClient'
import { categoryLabel } from '@/lib/backendCategories'
import { formatShortDate } from '@/lib/date'
import { fill } from '@/lib/i18n/translations'
import { assistantService, type AssistantProposal, type ChatTurn } from '@/services/assistantService'
import { useAuth } from '@/state/AuthContext'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'

// One exchange shown in the panel: the turn, plus the drafts the assistant
// prepared with it.
export interface AssistantTurn extends ChatTurn {
  proposals?: AssistantProposal[]
}

// "Asistente" (Header): a chat over the user's own data. The conversation
// lives in DashboardLayout so it survives closing the panel to review a
// draft. The assistant only reads; a draft opens the normal form.
export function AssistantPanel({
  turns,
  setTurns,
  onClose,
  onDraft,
}: {
  turns: AssistantTurn[]
  setTurns: (update: (turns: AssistantTurn[]) => AssistantTurn[]) => void
  onClose: () => void
  onDraft: (proposal: AssistantProposal) => void
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState<number | null>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' })
  }, [turns, sending])

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || sending) return
    const next = [...turns, { role: 'user' as const, text: question }]
    setTurns(() => next)
    setInput('')
    setError('')
    setSending(true)
    try {
      // The last 20 turns, oldest first, as the backend expects.
      const res = await assistantService.send(next.slice(-20).map(({ role, text: body }) => ({ role, text: body })))
      setTurns((list) => [...list, { role: 'model', text: res.reply || t('asst.empty'), proposals: res.proposals }])
      setRemaining(res.remaining)
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? t('asst.limit') : t('asst.error'))
      // The question stays in the field to try again.
      setTurns((list) => list.slice(0, -1))
      setInput(question)
    } finally {
      setSending(false)
    }
  }

  const footer = user?.isGuest ? (
    <button type="button" onClick={() => navigate('/register')} className="btn-cta h-10 cursor-pointer whitespace-nowrap rounded-[12px] px-5 text-label font-semibold">
      {t('guest.cta')}
    </button>
  ) : (
    <form
      className="flex w-full items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        void send(input)
      }}
    >
      <label className="sr-only" htmlFor="asst-input">{t('asst.placeholder')}</label>
      <textarea
        id="asst-input"
        data-autofocus
        rows={1}
        value={input}
        maxLength={2000}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void send(input)
          }
        }}
        placeholder={t('asst.placeholder')}
        className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-[12px] border border-border-input bg-surface px-3.5 py-2.5 text-body text-ink outline-none placeholder:text-ink-tertiary focus:border-2 focus:border-primary-border"
      />
      <button type="submit" disabled={sending || !input.trim()} className="btn-cta h-11 flex-none cursor-pointer whitespace-nowrap rounded-[12px] px-4 text-label font-semibold disabled:cursor-not-allowed disabled:opacity-50">
        {t('asst.send')}
      </button>
    </form>
  )

  return (
    <SidePanel title={t('asst.title')} onClose={onClose} footer={footer}>
      {turns.length === 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-body text-ink">{t(user?.isGuest ? 'asst.guest' : 'asst.intro')}</p>
          {!user?.isGuest && (
            <>
              <div className="flex flex-wrap gap-2">
                {(['asst.ex1', 'asst.ex2', 'asst.ex3'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => void send(t(k))}
                    className="min-h-9 cursor-pointer rounded-[10px] border border-border-input px-3 py-1.5 text-left text-body-sm text-ink-secondary hover:bg-surface-sunken hover:text-ink"
                  >
                    {t(k)}
                  </button>
                ))}
              </div>
              <p className="text-caption leading-[1.5] text-ink-tertiary">{t('asst.privacy')}</p>
            </>
          )}
        </div>
      )}
      <div role="log" aria-live="polite" aria-label={t('asst.title')} className="flex flex-col gap-3">
        {turns.map((turn, i) => (
          <Fragment key={i}>
            <div
              className={
                turn.role === 'user'
                  ? 'max-w-[85%] self-end whitespace-pre-wrap break-words rounded-[14px] rounded-br-[4px] bg-accent-soft px-3.5 py-2.5 text-body text-on-primary-soft'
                  : 'max-w-[92%] self-start break-words rounded-[14px] rounded-bl-[4px] bg-surface-sunken px-3.5 py-2.5 text-body text-ink'
              }
            >
              {turn.role === 'user' ? turn.text : <Rich text={turn.text} />}
            </div>
            {turn.proposals?.map((p, j) => <DraftCard key={j} proposal={p} onReview={() => onDraft(p)} />)}
          </Fragment>
        ))}
        {sending && <div className="self-start rounded-[14px] bg-surface-sunken px-3.5 py-2.5 text-body-sm text-ink-tertiary">{t('asst.thinking')}</div>}
        {error && (
          <div role="alert" className="rounded-[10px] bg-[rgba(255,98,98,.1)] px-3 py-2.5 text-body-sm font-semibold text-negative">
            {error}
          </div>
        )}
        {remaining !== null && remaining <= 5 && <div className="text-caption text-ink-tertiary">{fill(t('asst.remaining'), remaining)}</div>}
        <div ref={end} />
      </div>
    </SidePanel>
  )
}

// A draft the assistant prepared: what it would record, and a button that
// opens the normal form with it.
function DraftCard({ proposal: p, onReview }: { proposal: AssistantProposal; onReview: () => void }) {
  const { t } = useTranslation()
  const { format } = useCurrency()
  const meta = [p.category ? categoryLabel(p.category) : null, p.date ? formatShortDate(p.date) : null].filter(Boolean).join(' · ')
  return (
    <div className="flex flex-col gap-2 self-stretch rounded-[14px] border border-border bg-surface px-4 py-3">
      <div className="text-overline uppercase text-ink-secondary">{t('asst.draft')}</div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-title-sm font-semibold" title={p.description}>{p.description}</span>
        <span className={`font-numeric flex-none whitespace-nowrap text-title-sm font-semibold ${p.type === 'income' ? 'text-positive' : 'text-negative'}`}>
          {`${p.type === 'income' ? '+' : '−'}${format(p.amount)}`}
        </span>
      </div>
      {meta && <div className="truncate text-body-sm text-ink-tertiary">{meta}</div>}
      <button type="button" onClick={onReview} className="h-9 cursor-pointer self-start whitespace-nowrap rounded-[10px] bg-accent-soft px-4 text-label font-semibold text-on-primary-soft hover:brightness-95">
        {t('asst.review')}
      </button>
    </div>
  )
}

// The model's light markdown: **bold** and "- " / "* " list lines.
function Rich({ text }: { text: string }) {
  const inline = (line: string): ReactNode[] => line.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) => (chunk.startsWith('**') && chunk.endsWith('**') ? <strong key={i}>{chunk.slice(2, -2)}</strong> : chunk))
  return (
    <>
      {text.split('\n').map((line, i) => {
        const item = /^\s*[-*•]\s+(.*)$/.exec(line)
        if (item) return <div key={i} className="flex gap-2 pl-1"><span aria-hidden="true">•</span><span>{inline(item[1]!)}</span></div>
        return line.trim() ? <p key={i} className="mb-1 last:mb-0">{inline(line)}</p> : null
      })}
    </>
  )
}
