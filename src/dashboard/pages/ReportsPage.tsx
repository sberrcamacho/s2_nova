import { useState } from 'react'
import { BarChart3, Download, FileSpreadsheet, FileText, PiggyBank, Receipt } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/state/ToastContext'
import { formatLongDate, todayISO } from '@/lib/date'

interface ReportType {
  id: string
  title: string
  description: string
  icon: React.ReactNode
}

const REPORT_TYPES: ReportType[] = [
  { id: 'monthly_summary', title: 'Resumen mensual', description: 'Ingresos, gastos y ahorro del mes seleccionado.', icon: <FileText className="h-5 w-5" /> },
  { id: 'expense_statement', title: 'Estado de gastos', description: 'Detalle completo de gastos por categoría.', icon: <Receipt className="h-5 w-5" /> },
  { id: 'budget_report', title: 'Reporte de presupuestos', description: 'Cumplimiento de presupuestos por categoría.', icon: <PiggyBank className="h-5 w-5" /> },
  { id: 'annual_overview', title: 'Panorama anual', description: 'Tendencias e indicadores del año en curso.', icon: <BarChart3 className="h-5 w-5" /> },
]

const FORMAT_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
]

interface GeneratedReport {
  id: string
  title: string
  format: string
  date: string
  size: string
}

export default function ReportsPage() {
  const { showToast } = useToast()
  const [format, setFormat] = useState('pdf')
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [generated, setGenerated] = useState<GeneratedReport[]>([])

  const generate = async (report: ReportType) => {
    setGeneratingId(report.id)
    await new Promise((r) => setTimeout(r, 1100))
    setGeneratingId(null)
    setGenerated((prev) => [
      {
        id: `${report.id}_${Date.now()}`,
        title: report.title,
        format: format.toUpperCase(),
        date: todayISO(),
        size: `${(180 + Math.random() * 340).toFixed(0)} KB`,
      },
      ...prev,
    ])
    showToast(`${report.title} generado en ${format.toUpperCase()}`, 'success')
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-ink">Formato de exportación</h3>
          <p className="text-xs text-ink-tertiary">Se aplicará a los reportes que generes a continuación.</p>
        </div>
        <Select options={FORMAT_OPTIONS} value={format} onChange={(e) => setFormat(e.target.value)} className="sm:w-52" />
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORT_TYPES.map((report) => (
          <Card key={report.id} className="flex flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-primary">
                {report.icon}
              </span>
              <div>
                <p className="text-[14.5px] font-bold text-ink">{report.title}</p>
                <p className="mt-0.5 text-xs text-ink-tertiary">{report.description}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              loading={generatingId === report.id}
              leftIcon={<FileSpreadsheet className="h-4 w-4" />}
              onClick={() => generate(report)}
              className="mt-auto"
            >
              Generar reporte
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 text-[15px] font-bold text-ink">Reportes generados</h3>
        {generated.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-ink-tertiary">
            Aún no has generado reportes. Los que generes aparecerán aquí, listos para descargar.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {generated.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-3">
                <FileText className="h-4 w-4 text-ink-tertiary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{r.title}</p>
                  <p className="text-xs text-ink-tertiary">
                    {formatLongDate(r.date)} · {r.size}
                  </p>
                </div>
                <Badge tone="neutral">{r.format}</Badge>
                <button
                  onClick={() => showToast('Descarga simulada — no hay archivo real en este entorno de demostración.', 'info')}
                  aria-label={`Descargar ${r.title}`}
                  className="rounded-[var(--radius-sm)] p-2 text-ink-tertiary transition-colors hover:bg-accent-soft hover:text-primary"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
