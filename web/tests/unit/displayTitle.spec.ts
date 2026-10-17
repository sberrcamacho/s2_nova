import { afterEach, describe, expect, it } from 'vitest'
import { displayTitle } from '@/lib/backendCategories'
import { setCurrentLanguage } from '@/lib/i18n/translations'

const expense = (description: string, category = 'exp.food.groceries') => ({ description, type: 'expense' as const, category })

describe('displayTitle', () => {
  afterEach(() => setCurrentLanguage('es'))

  it('shows a suggested title in the current language, whichever it was saved in', () => {
    setCurrentLanguage('en')
    expect(displayTitle(expense('Mercado'))).toBe('Groceries')
    expect(displayTitle(expense('Gasto', ''))).toBe('Expense')
    expect(displayTitle({ description: 'Transferencia', type: 'transfer', category: 'transfer' })).toBe('Transfer')
    setCurrentLanguage('es')
    expect(displayTitle(expense('Groceries'))).toBe('Mercado')
    expect(displayTitle({ description: 'Income', type: 'income', category: 'inc.work.salary' })).toBe('Ingreso')
  })

  it('keeps a title the user wrote as typed', () => {
    setCurrentLanguage('en')
    expect(displayTitle(expense('Mercado del mes'))).toBe('Mercado del mes')
    // Another category's name is the user's own words here.
    expect(displayTitle(expense('Cafés'))).toBe('Cafés')
    expect(displayTitle(expense(''))).toBe('')
  })
})
