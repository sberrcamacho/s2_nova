import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AmountField } from '@/components/v2/Kit'
import { evalExpr } from '@/lib/nuevoMovimiento'

function Harness() {
  const [expr, setExpr] = useState('')
  return (
    <>
      <AmountField expr={expr} onExpr={setExpr} label="Límite" />
      <output>{evalExpr(expr)}</output>
    </>
  )
}

describe('AmountField', () => {
  it('takes typed arithmetic and decimals like Nuevo movimiento, and shows the total', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText('Límite'), '150000+18500*2')
    expect(screen.getByLabelText('Límite')).toHaveValue('150.000 + 18.500 × 2')
    expect(screen.getByText('= $187.000')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('187000')

    await user.clear(screen.getByLabelText('Límite'))
    await user.type(screen.getByLabelText('Límite'), '12,5')
    expect(screen.getByRole('status')).toHaveTextContent('12.5')
  })

  it('switches to the calculator keypad', async () => {
    localStorage.removeItem('nm.calc')
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Teclado' }))
    for (const k of ['7', '×', '3', '=']) await user.click(screen.getByRole('button', { name: k }))
    expect(screen.getByRole('status')).toHaveTextContent('21')
    localStorage.removeItem('nm.calc')
  })
})
