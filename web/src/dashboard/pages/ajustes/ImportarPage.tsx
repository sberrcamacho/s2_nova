import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AjActions, AjCard, AjCardTitle, AjMessage, AjOutlineButton, AjSubHeader } from '@/dashboard/components/ajustes/AjustesUi'
import { csvToImportRows } from '@/lib/csv'
import { fill } from '@/lib/inicio'
import { userService, type ImportRow, type ImportSummary } from '@/services/userService'
import { useAppData } from '@/state/AppDataContext'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'

const MAX_ROWS = 500

// Ajustes › Importar datos: a CSV of movements in the S2 Nova template. The
// server validates it first (dry run); nothing is written until the user
// confirms, and a file with any bad row imports nothing.
export default function ImportarPage() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { notifyChanged } = useAppData()
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([userService.importTemplate()], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 's2-nova-plantilla.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const onFile = async (file: File | undefined) => {
    setSummary(null)
    setRows(null)
    setError('')
    if (!file) return
    setFileName(file.name)
    const parsed = csvToImportRows(await file.text())
    if (!parsed || parsed.length === 0) return setError(t('aj.imp.errFile'))
    if (parsed.length > MAX_ROWS) return setError(t('aj.imp.errTooMany'))
    setBusy(true)
    try {
      setRows(parsed)
      setSummary(await userService.importTransactions(parsed, true))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.generic'))
    } finally {
      setBusy(false)
    }
  }

  const canImport = !!rows && !!summary && summary.invalid === 0 && summary.valid > 0 && !busy

  const submit = async () => {
    if (!canImport || !rows) return
    setBusy(true)
    try {
      await userService.importTransactions(rows, false)
      notifyChanged()
      showToast(fill(t('aj.imp.done'), String(rows.length)), 'success')
      navigate('/movimientos', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('api.generic'))
      setBusy(false)
    }
  }

  return (
    <div className="flex max-w-[676px] flex-col gap-[18px] px-7 pt-[26px] pb-10">
      <AjSubHeader title={t('aj.import')} subtitle={t('aj.imp.subtitle')} />

      <AjCard className="flex flex-col gap-3 p-[22px]">
        <AjCardTitle>{t('aj.imp.template')}</AjCardTitle>
        <div className="text-body-sm text-ink-secondary">{t('aj.imp.templateHint')}</div>
        <div className="flex flex-wrap gap-2">
          <AjOutlineButton onClick={downloadTemplate}>{t('aj.imp.download')}</AjOutlineButton>
          <AjOutlineButton onClick={() => input.current?.click()}>{t('aj.imp.file')}</AjOutlineButton>
        </div>
        <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" tabIndex={-1} aria-label={t('aj.imp.file')} onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
        {fileName && <div className="truncate text-body-sm font-semibold">{fileName}</div>}
      </AjCard>

      {(summary || error) && (
        <AjCard className="flex flex-col gap-3 p-[22px]" >
          <div aria-live="polite" className="flex flex-col gap-2">
            {error && <AjMessage>{error}</AjMessage>}
            {summary && (
              <>
                <AjMessage ok={summary.invalid === 0}>{fill(t('aj.imp.preview'), String(summary.valid), String(summary.total))}</AjMessage>
                {summary.rows.slice(0, 10).map((r) => (
                  <div key={r.row} className="text-body-sm text-negative">
                    {fill(t(r.error === 'wallet' ? 'aj.imp.errWallet' : 'aj.imp.errInvalid'), String(r.row))}
                  </div>
                ))}
                {summary.invalid > 0 && <div className="text-body-sm text-ink-secondary">{t('aj.imp.fixHint')}</div>}
                {summary.rows.length > 10 && <div className="text-body-sm text-ink-secondary">+{summary.rows.length - 10}</div>}
              </>
            )}
          </div>
          <AjActions onCancel={() => navigate('/ajustes')} submitLabel={t('aj.imp.submit')} onSubmit={submit} disabled={!canImport} />
        </AjCard>
      )}
    </div>
  )
}
