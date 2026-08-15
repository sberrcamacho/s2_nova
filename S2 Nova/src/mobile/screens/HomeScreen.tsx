import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, Bell, ChevronRight, PiggyBank, Sparkles } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Sparkle } from '@/components/ui/Sparkle'
import { NovaDonutChart } from '@/components/charts/NovaDonutChart'
import { TransactionRow } from '@/components/transactions/TransactionRow'
import { useAppData } from '@/state/AppDataContext'
import { useAuth } from '@/state/AuthContext'
import { analyticsService } from '@/services/analyticsService'
import { categoryMap } from '@/data/categories'
import { formatCOP } from '@/lib/currency'
import type { CategoryBreakdownEntry, MonthlySummary } from '@/types'

export default function HomeScreen() {
  const { transactions, isLoading } = useAppData()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [breakdown, setBreakdown] = useState<CategoryBreakdownEntry[]>([])

  useEffect(() => {
    analyticsService.getMonthlySummary().then(setSummary)
    analyticsService.getCategoryBreakdown().then(setBreakdown)
  }, [transactions])

  const balance = useMemo(
    () => transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0),
    [transactions],
  )

  const recent = transactions.slice(0, 5)
  const donutData = breakdown.slice(0, 5).map((entry) => ({
    name: categoryMap[entry.category]?.label ?? entry.category,
    value: entry.amount,
    color: categoryMap[entry.category]?.color ?? '#9C9CAA',
  }))

  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <div className="flex flex-col gap-6 px-5 pb-8 pt-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-ink-secondary">Hola, {firstName} 👋</p>
          <h1 className="text-[19px] font-extrabold text-ink">Tu resumen financiero</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            aria-label="Notificaciones"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-ink-secondary"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-negative" />
          </button>
          <button onClick={() => navigate('/app/profile')} aria-label="Ir a mi perfil">
            <Avatar initials={user?.avatarInitials ?? 'US'} size="md" />
          </button>
        </div>
      </header>

      {/* Balance hero — subtle black-to-bluish-purple gradient */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-xl)] p-6 text-white shadow-[var(--shadow-lg)]"
        style={{ background: 'linear-gradient(135deg, var(--hero-from) 0%, var(--hero-to) 100%)' }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-70"
          style={{ background: 'radial-gradient(circle, var(--hero-glow) 0%, transparent 70%)' }}
        />
        <Sparkle size={16} className="pointer-events-none absolute right-6 top-6 text-white/50 animate-sparkle" />
        <p className="relative text-[12.5px] font-semibold uppercase tracking-wide text-white/60">Saldo actual</p>
        <p className="font-numeric relative mt-1.5 text-[34px] font-extrabold leading-none tracking-tight">
          {formatCOP(balance)}
        </p>

        <div className="relative mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
          <HeroStat icon={<ArrowDownLeft className="h-3.5 w-3.5" />} label="Ingresos" value={summary?.income ?? 0} tone="up" />
          <HeroStat icon={<ArrowUpRight className="h-3.5 w-3.5" />} label="Gastos" value={summary?.expenses ?? 0} tone="down" />
          <HeroStat icon={<PiggyBank className="h-3.5 w-3.5" />} label="Ahorro" value={summary?.savings ?? 0} tone="neutral" />
        </div>
      </div>

      {/* Spending overview */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-ink">Resumen de gastos</h2>
          <button
            onClick={() => navigate('/app/statistics')}
            className="flex items-center gap-0.5 text-xs font-bold text-primary"
          >
            Ver más <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {breakdown.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title="Sin gastos este mes"
            description="Registra tu primera transacción para ver el resumen aquí."
          />
        ) : (
          <div className="flex items-center gap-5">
            <NovaDonutChart data={donutData} height={132} />
            <div className="flex flex-1 flex-col gap-2.5">
              {breakdown.slice(0, 4).map((entry, i) => (
                <div key={entry.category} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: donutData[i]?.color }}
                  />
                  <span className="flex-1 truncate font-semibold text-ink-secondary">{categoryMap[entry.category]?.label ?? entry.category}</span>
                  <span className="font-numeric font-bold text-ink">{entry.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Recent transactions */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-ink">Movimientos recientes</h2>
          <button
            onClick={() => navigate('/app/transactions')}
            className="flex items-center gap-0.5 text-xs font-bold text-primary"
          >
            Ver todos <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <Card className="p-2">
          {isLoading ? (
            <p className="p-4 text-center text-xs text-ink-tertiary">Cargando movimientos…</p>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="Aún no tienes movimientos"
              description="Agrega tu primer ingreso o gasto para comenzar."
            />
          ) : (
            recent.map((t) => (
              <TransactionRow key={t.id} transaction={t} onClick={() => navigate('/app/transactions', { state: { openId: t.id } })} />
            ))
          )}
        </Card>
      </div>
    </div>
  )
}

function HeroStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'up' | 'down' | 'neutral' }) {
  return (
    <div>
      <div className={`mb-1 flex items-center gap-1 text-[11px] font-semibold ${tone === 'up' ? 'text-[#7CE8B8]' : tone === 'down' ? 'text-[#FF9F9F]' : 'text-white/70'}`}>
        {icon}
        {label}
      </div>
      <p className="font-numeric text-[13.5px] font-bold text-white">{formatCOP(value)}</p>
    </div>
  )
}
