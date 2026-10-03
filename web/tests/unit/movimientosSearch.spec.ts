import { describe, expect, it } from 'vitest'
import { matchesSearch } from '@/lib/movimientos'

describe('matchesSearch', () => {
  it('ignores accents and case', () => {
    expect(matchesSearch('Café Tostao', 'cafe')).toBe(true)
    expect(matchesSearch('Alimentación · Mercado', 'ALIMENTACION')).toBe(true)
    expect(matchesSearch('cafe', 'Café')).toBe(true)
  })

  it('needs every word, in any order', () => {
    expect(matchesSearch('Mercado semanal Éxito Bancolombia', 'exito mercado')).toBe(true)
    expect(matchesSearch('Mercado semanal Éxito', 'mercado nequi')).toBe(false)
  })

  it('matches everything for a blank query', () => {
    expect(matchesSearch('Arriendo', '   ')).toBe(true)
  })
})
