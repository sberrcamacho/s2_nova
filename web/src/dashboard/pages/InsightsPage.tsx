import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { getInsights, type Insight, type InsightTone } from '@/services/insightsService'
import { insightToneTranslationKey } from '@/lib/i18n/translations'
import { cn } from '@/lib/cn'

const TONE_ACCENT: Record<InsightTone, string> = {
  negative: 'var(--color-negative)',
  warning: 'var(--color-warning)',
  positive: 'var(--color-positive)',
  neutral: 'var(--color-primary)',
}

const TONE_TAG_CLASSES: Record<InsightTone, string> = {
  negative: 'bg-negative-soft text-negative',
  warning: 'bg-warning-soft text-warning',
  positive: 'bg-positive-soft text-positive',
  neutral: 'bg-accent-soft text-primary',
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
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {visible.map((insight) => (
          <Card key={insight.id} className="p-[18px_20px]" style={{ borderLeft: `3px solid ${TONE_ACCENT[insight.tone]}` }}>
            <span
              className={cn('inline-flex items-center rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.09em]', TONE_TAG_CLASSES[insight.tone])}
            >
              {t(insightToneTranslationKey(insight.tone))}
            </span>
            <p className="mt-2.5 text-[14.5px] font-extrabold text-ink">{insight.title}</p>
            <p className="mt-1.5 text-[12.5px] leading-[1.55] text-ink-secondary">{insight.description}</p>
          </Card>
        ))}
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
