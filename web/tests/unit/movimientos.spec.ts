import { describe, expect, it } from 'vitest'
import { recentMonths, shortWallet } from '@/lib/movimientos'

describe('movimientos helpers', () => {
  it('lists the current month and the ones before it, across a year boundary', () => {
    expect(recentMonths('2026-02-10', 4)).toEqual(['2026-02', '2026-01', '2025-12', '2025-11'])
  })

  it('shortens a wallet name at the em dash', () => {
    expect(shortWallet('Bancolombia — Ahorros')).toBe('Bancolombia')
    expect(shortWallet('Nequi')).toBe('Nequi')
  })
})
