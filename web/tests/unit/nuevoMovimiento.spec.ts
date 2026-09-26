import { describe, expect, it } from 'vitest'
import { RP_DEFAULT, evalExpr, fmtExpr, pressKey, repeatShort, repeatSummary, typedExpr } from '@/lib/nuevoMovimiento'

describe('nuevoMovimiento amount', () => {
  it('evaluates × ÷ before + − and clamps at zero', () => {
    expect(evalExpr('150000+18500')).toBe(168500)
    expect(evalExpr('1000+200×3')).toBe(1600)
    expect(evalExpr('10÷0')).toBe(10)
    expect(evalExpr('5−9')).toBe(0)
    expect(evalExpr('5,99×2')).toBe(11.98)
  })

  it('maps typed operators and drops the display grouping', () => {
    expect(typedExpr('150.000 + 18.500')).toBe('150000+18500')
    expect(typedExpr('2*3/4-1x2')).toBe('2×3÷4−1×2')
    expect(fmtExpr('150000+18500')).toBe('150.000 + 18.500')
  })

  it('applies the calculator key rules', () => {
    expect(pressKey('', '+')).toBe('')
    expect(pressKey('12+', '×')).toBe('12×')
    expect(pressKey('12,', '+')).toBe('12+')
    expect(pressKey('1,5', ',')).toBe('1,5')
    expect(pressKey('', ',')).toBe('0,')
    expect(pressKey('0', '7')).toBe('7')
    expect(pressKey('', '00')).toBe('')
    expect(pressKey('123456789012', '3')).toBe('123456789012')
    expect(pressKey('150000+18500', '=')).toBe('168500')
    expect(pressKey('12', '⌫')).toBe('1')
    expect(pressKey('12', 'C')).toBe('')
  })
})

describe('nuevoMovimiento repeat', () => {
  it('summarizes the repetition like the mockup', () => {
    expect(repeatSummary({ ...RP_DEFAULT, freq: 'Semanal', count: 4 }, '2026-08-21')).toBe('Cada semana × 4 · del 21 ago al 11 sep')
    expect(repeatSummary({ ...RP_DEFAULT, endMode: 'never' }, '2026-08-21')).toBe('Cada mes · sin fecha de fin')
    expect(repeatSummary(null, '2026-08-21')).toBe('No se repite')
    expect(repeatShort({ ...RP_DEFAULT, freq: 'Semanal', count: 4 })).toBe('Semanal ×4')
    expect(repeatShort(null)).toBe('Repetir')
  })
})
