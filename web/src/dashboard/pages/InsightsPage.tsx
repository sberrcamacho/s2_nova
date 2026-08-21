import { useEffect, useState } from 'react'
import { AlertTriangle, Calendar, CreditCard, Flag, Lightbulb, PieChart, Repeat, TrendingDown, TrendingUp } from 'lucide-react'
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
export default function InsightsPage() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t, language } = useTranslation()
  const [insights, setInsights] = useState<Insight[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    getInsights(language, format)
      .then(setInsights)
      .finally(() => setIsLoading(false))
  }, [transactions, language, format])

  if (!isLoading && insights.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Lightbulb className="mx-auto h-8 w-8 text-ink-tertiary" />
        <p className="mt-3 text-sm font-bold text-ink">{t('insights.empty')}</p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {insights.map((insight) => {
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
  )
}
