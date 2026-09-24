import { describe, expect, it } from 'vitest'
import { filterMovements, recentMonths, shortWallet } from '@/lib/movimientos'
import type { Transaction } from '@/types'

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 'x', accountId: 'a1', description: 'x', amount: 1000, type: 'expense', category: 'food', date: '2026-09-21', paymentMethod: 'cash', ...over,
})

describe('movimientos helpers', () => {
  it('lists the current month and the ones before it, across a year boundary', () => {
    expect(recentMonths('2026-02-10', 4)).toEqual(['2026-02', '2026-01', '2025-12', '2025-11'])
  })

  it('shortens a wallet name at the em dash', () => {
    expect(shortWallet('Bancolombia — Ahorros')).toBe('Bancolombia')
    expect(shortWallet('Nequi')).toBe('Nequi')
  })

  it('filters by type (transfers are neither) and searches description, merchant, category and wallet', () => {
    const rows = [
      tx({ id: '1', description: 'Café', merchant: 'Tostao', accountId: 'cash' }),
      tx({ id: '2', description: 'Viaje en app', merchant: 'Uber', category: 'transportation', accountId: 'nequi' }),
      tx({ id: '3', description: 'Salario', type: 'income', category: 'salary', accountId: 'bank' }),
      tx({ id: '4', description: 'Ahorro', type: 'transfer', category: 'other', accountId: 'bank', transferAccountId: 'nequi' }),
    ]
    const names: Record<string, string> = { cash: 'Efectivo', nequi: 'Nequi', bank: 'Bancolombia' }
    const labels = {
      category: (t: Transaction) => ({ food: 'Alimentación', transportation: 'Transporte', salary: 'Salario', other: 'Otros' })[t.category as string] ?? '',
      wallet: (t: Transaction) => `${names[t.accountId]} ${t.transferAccountId ? names[t.transferAccountId] : ''}`,
    }
    const ids = (list: Transaction[]) => list.map((t) => t.id)
    expect(ids(filterMovements(rows, 'expenses', '', labels))).toEqual(['1', '2'])
    expect(ids(filterMovements(rows, 'income', '', labels))).toEqual(['3'])
    expect(ids(filterMovements(rows, 'all', 'tostao', labels))).toEqual(['1'])
    expect(ids(filterMovements(rows, 'all', 'transporte', labels))).toEqual(['2'])
    expect(ids(filterMovements(rows, 'all', 'nequi', labels))).toEqual(['2', '4'])
    expect(ids(filterMovements(rows, 'expenses', 'nequi', labels))).toEqual(['2'])
  })
})
