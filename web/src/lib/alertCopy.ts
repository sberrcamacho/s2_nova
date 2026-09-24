import type { AppAlert } from '@/services/alertService'
import { goalMark } from '@/lib/categoryGlyphs'
import { budgetNote, fill, shortDate } from '@/lib/inicio'
import type { TranslationKey } from '@/lib/i18n/translations'
import type { CategoryId } from '@/types'

// Web copy for each shared alert rule, per the Web v2 mockup's ALERTS
// (sentences end with a period on Web; Android's card copy doesn't). Budget
// alerts append the month's pace when it crosses the limit before month end.
export function alertCopy(
  alert: AppAlert,
  today: string,
  language: 'es' | 'en',
  t: (k: TranslationKey) => string,
  tCategory: (id: CategoryId) => string,
  format: (v: number) => string,
) {
  switch (alert.kind) {
    case 'series_due':
      return {
        title: alert.overdue ? fill(t('alert.seriesOverdue.title'), alert.name, shortDate(alert.dueDate, language)) : fill(t('alert.seriesDue.title'), alert.name),
        body: fill(t('alert.series.body'), format(alert.amount)),
        glyph: alert.category,
        color: undefined,
      }
    case 'loan_open':
      return {
        title: fill(t(alert.loanKind === 'lent' ? 'alert.loanLent.title' : 'alert.loanBorrowed.title'), alert.counterpartyName ?? t('loans.unknownPerson')),
        body: fill(t('alert.loan.body'), format(alert.outstanding), shortDate(alert.dueDate, language)),
        glyph: 'other' as const,
        color: undefined,
      }
    case 'budget_at_risk': {
      const note = budgetNote(alert.spent, alert.limit, alert.percentage, today)
      return {
        title: fill(t('alert.budget.title'), alert.name ?? tCategory(alert.category), alert.percentage),
        body: fill(t('alert.budget.body'), format(alert.spent), format(alert.limit)) + (note.kind === 'exceeds' ? fill(t('alert.budget.pace'), note.days) : ''),
        glyph: alert.category,
        color: undefined,
      }
    }
    case 'goal_near': {
      const mark = goalMark(alert.themeIcon)
      return {
        title: fill(t('alert.goal.title'), alert.name, alert.percentage),
        body: fill(t('alert.goal.body'), format(alert.remaining)),
        glyph: mark.glyph,
        color: mark.color,
      }
    }
  }
}
