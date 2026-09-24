import type { AppAlert } from '@/services/alertService'
import { goalMark } from '@/lib/categoryGlyphs'
import { budgetNote, fill, shortDate } from '@/lib/inicio'
import type { TranslationKey } from '@/lib/i18n/translations'
import type { CategoryId } from '@/types'
import type { MoneyTemplate } from '@/components/v2/Money'

// Web copy for each shared alert rule, per the Web v2 mockup's ALERTS
// (sentences end with a period on Web; Android's card copy doesn't). Budget
// alerts append the month's pace when it crosses the limit before month end.
// Bodies are templates with their amounts marked, so the card can blur just
// the amounts when amounts are hidden (see MoneyText).
export function alertCopy(
  alert: AppAlert,
  today: string,
  language: 'es' | 'en',
  t: (k: TranslationKey) => string,
  tCategory: (id: CategoryId) => string,
): { title: string; body: MoneyTemplate[]; glyph: CategoryId; color: string | undefined } {
  switch (alert.kind) {
    case 'series_due':
      return {
        title: alert.overdue ? fill(t('alert.seriesOverdue.title'), alert.name, shortDate(alert.dueDate, language)) : fill(t('alert.seriesDue.title'), alert.name),
        body: [{ template: t('alert.series.body'), args: [{ amount: alert.amount }] }],
        glyph: alert.category,
        color: undefined,
      }
    case 'loan_open':
      return {
        title: fill(t(alert.loanKind === 'lent' ? 'alert.loanLent.title' : 'alert.loanBorrowed.title'), alert.counterpartyName ?? t('loans.unknownPerson')),
        body: [{ template: t('alert.loan.body'), args: [{ amount: alert.outstanding }, shortDate(alert.dueDate, language)] }],
        glyph: 'other',
        color: undefined,
      }
    case 'budget_at_risk': {
      const note = budgetNote(alert.spent, alert.limit, alert.percentage, today)
      return {
        title: fill(t('alert.budget.title'), alert.name ?? tCategory(alert.category), alert.percentage),
        body: [
          { template: t('alert.budget.body'), args: [{ amount: alert.spent }, { amount: alert.limit }] },
          ...(note.kind === 'exceeds' ? [{ template: t('alert.budget.pace'), args: [note.days] }] : []),
        ],
        glyph: alert.category,
        color: undefined,
      }
    }
    case 'goal_near': {
      const mark = goalMark(alert.themeIcon)
      return {
        title: fill(t('alert.goal.title'), alert.name, alert.percentage),
        body: [{ template: t('alert.goal.body'), args: [{ amount: alert.remaining }] }],
        glyph: mark.glyph,
        color: mark.color,
      }
    }
  }
}
