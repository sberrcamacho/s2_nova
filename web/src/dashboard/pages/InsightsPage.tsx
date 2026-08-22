import { useEffect, useState } from 'react'
import { AlertTriangle, Calendar, ChevronDown, ChevronUp, CreditCard, Flag, Lightbulb, PieChart, Repeat, TrendingDown, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { getInsights, type Insight, type InsightKind, type InsightTone } from '@/services/insightsService'
import { insightToneTranslationKey } from '@/lib/i18n/translations'

const INSIGHT_ICON: Record<InsightKind, typeof Lightbulb> = {
  budgetPace: AlertTriangle,
  categorySpike: TrendingUp,
  categoryShare: PieChart,
  subscriptions: CreditCard,
  savingsRate: TrendingDown,
  goalTarget: Flag,
  goalProgress: Flag,
  unusualTransaction: AlertTriangle,
  monthProjection: Calendar,
  upcomingExpenses: Repeat,
  spendingStreak: TrendingUp,
}

const TONE_BADGE: Record<InsightTone, 'positive' | 'warning' | 'negative' | 'neutral'> = {
  positive: 'positive',
  warning: 'warning',
  negative: 'negative',
  neutral: 'neutral',
}

// Web-exclusive prescriptive suggestions — see insightsService.ts for how
// each is computed. Android has no equivalent surface by design (root
// AGENTS.md: Web = macro-analysis).
const INITIAL_COUNT = 4

export default function InsightsPage() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t, language } = useTranslation()
  const [insights, setInsights] = useState<Insight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    getInsights(language, format)
      .then(setInsights)
      .finally(() => setIsLoading(false))
  }, [transactions, language, format])

  useEffect(() => {
    setExpanded(false)
  }, [insights.length])

  if (!isLoading && insights.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Lightbulb className="mx-auto h-8 w-8 text-ink-tertiary" />
        <p className="mt-3 text-sm font-bold text-ink">{t('insights.empty')}</p>
      </Card>
    )
  }

  // Progressive disclosure: lead with the first few insights and keep the
  // rest a click away, instead of dumping the full list at once.
  const visible = expanded ? insights : insights.slice(0, INITIAL_COUNT)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visible.map((insight) => {
          const Icon = INSIGHT_ICON[insight.kind]
          return (
            <Card key={insight.id} className="p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-ink-secondary" />
                  <p className="text-[13.5px] font-bold text-ink">{insight.title}</p>
                </div>
                <Badge tone={TONE_BADGE[insight.tone]}>{t(insightToneTranslationKey(insight.tone))}</Badge>
              </div>
              <p className="text-sm text-ink-secondary">{insight.description}</p>
            </Card>
          )
        })}
      </div>
      {insights.length > INITIAL_COUNT && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center justify-center gap-1.5 self-center rounded-full border border-border px-4 py-2 text-xs font-bold text-ink-secondary transition-colors hover:text-ink"
        >
          {expanded ? t('insights.showLess') : t('insights.showMore')}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  )
}
