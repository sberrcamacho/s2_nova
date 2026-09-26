import type { AppAlert } from '@/services/alertService'
import { categoryColor, glyphOf, goalMark } from '@/lib/categoryGlyphs'
import { budgetNote, fill, shortDate } from '@/lib/inicio'
import { shortWallet } from '@/lib/movimientos'
import type { TranslationKey } from '@/lib/i18n/translations'
import type { CategoryId, Wallet } from '@/types'
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
  wallets: Wallet[] = [],
): { title: string; body: MoneyTemplate[]; glyph: string[]; color: string } {
  switch (alert.kind) {
    case 'series_due':
      return {
        title: alert.overdue ? fill(t('alert.seriesOverdue.title'), alert.name, shortDate(alert.dueDate, language)) : fill(t('alert.seriesDue.title'), alert.name),
        body: [{ template: t('alert.series.body'), args: [{ amount: alert.amount }] }],
        glyph: glyphOf(alert.category),
        color: categoryColor(alert.category),
      }
    case 'loan_open':
      return {
        title: fill(t(alert.loanKind === 'lent' ? 'alert.loanLent.title' : 'alert.loanBorrowed.title'), alert.counterpartyName ?? t('loans.unknownPerson')),
        body: [{ template: t('alert.loan.body'), args: [{ amount: alert.outstanding }, shortDate(alert.dueDate, language)] }],
        glyph: glyphOf('exp.other'),
        color: categoryColor('exp.other'),
      }
    case 'budget_at_risk': {
      const note = budgetNote(alert.spent, alert.limit, alert.percentage, today)
      return {
        title: fill(t('alert.budget.title'), alert.name ?? tCategory(alert.category), alert.percentage),
        body: [
          { template: t('alert.budget.body'), args: [{ amount: alert.spent }, { amount: alert.limit }] },
          ...(note.kind === 'exceeds' ? [{ template: t('alert.budget.pace'), args: [note.days] }] : []),
        ],
        glyph: glyphOf(alert.category),
        color: categoryColor(alert.category),
      }
    }
    case 'goal_near': {
      const mark = goalMark(alert.icon)
      return {
        title: fill(t('alert.goal.title'), alert.name, alert.percentage),
        body: [{ template: t('alert.goal.body'), args: [{ amount: alert.remaining }] }],
        glyph: mark.glyph,
        color: mark.color,
      }
    }
    case 'goal_plan_due': {
      const mark = goalMark(alert.icon)
      const wallet = shortWallet(wallets.find((w) => w.id === alert.accountId)?.name ?? '')
      const when = alert.dueDate === today ? 'para hoy' : `para el ${shortDate(alert.dueDate, language)}`
      return {
        title: `Aporte programado a ${alert.name}`,
        body: [{ template: `Tienes un aporte de {0} ${alert.currency} ${when} desde {1}.`, args: [{ amount: alert.amount }, wallet] }],
        glyph: mark.glyph,
        color: mark.color,
      }
    }
    case 'goal_plan_auto': {
      const mark = goalMark(alert.icon)
      return {
        title: 'Aporte automático registrado',
        body: [{ template: `{0} ${alert.currency} a {1} desde {2} · {3}`, args: [{ amount: alert.amount }, alert.name, shortWallet(alert.walletName), shortDate(alert.date, language)] }],
        glyph: mark.glyph,
        color: mark.color,
      }
    }
    case 'tx_planned':
      return {
        title: `${alert.name || tCategory(alert.category)} se registra el ${shortDate(alert.dueDate, language)}`,
        body: [{ template: '{0} · {1} · te pediremos confirmarlo', args: [{ amount: alert.amount, currency: alert.currency }, shortWallet(alert.walletName)] }],
        glyph: glyphOf(alert.category),
        color: categoryColor(alert.category),
      }
  }
}
