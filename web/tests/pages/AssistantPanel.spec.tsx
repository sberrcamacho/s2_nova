import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import { AssistantPanel, type AssistantTurn } from '@/dashboard/components/AssistantPanel'
import type { AssistantProposal } from '@/services/assistantService'

function Harness({ onDraft }: { onDraft: (p: AssistantProposal) => void }) {
  const [turns, setTurns] = useState<AssistantTurn[]>([])
  return <AssistantPanel turns={turns} setTurns={setTurns} onClose={() => {}} onDraft={onDraft} />
}

describe('Asistente', () => {
  it('answers a question and offers its draft to review, without saving it', async () => {
    const asked: unknown[] = []
    mockSession()
    server.use(
      http.post(`${BASE}/assistant/messages`, async ({ request }) => {
        asked.push(await request.json())
        return HttpResponse.json({
          reply: 'Este mes gastaste **$612.400** en Alimentación.\n- Mercado: $400.000',
          proposals: [{ type: 'EXPENSE', amount: 25_000, description: 'Almuerzo', categoryId: 'uuid-exp.food.restaurants', date: '2026-08-21' }],
          remaining: 19,
        })
      }),
    )
    const onDraft = vi.fn()
    const user = userEvent.setup()
    renderApp(<Harness onDraft={onDraft} />)

    expect(await screen.findByText(/Pregúntame por tus gastos/)).toBeInTheDocument()
    expect(screen.getByText(/se envían a Gemini/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '¿Cuánto gasté este mes?' }))

    expect(await screen.findByText('$612.400')).toBeInTheDocument()
    expect(screen.getByText('Borrador')).toBeInTheDocument()
    expect(screen.getByText('Almuerzo')).toBeInTheDocument()
    expect(screen.getByText('−$25.000')).toBeInTheDocument()
    expect(asked[0]).toMatchObject({ messages: [{ role: 'user', text: '¿Cuánto gasté este mes?' }] })

    await user.click(screen.getByRole('button', { name: 'Revisar y registrar' }))
    expect(onDraft).toHaveBeenCalledWith(expect.objectContaining({ type: 'expense', amount: 25_000, description: 'Almuerzo', category: 'exp.food.restaurants' }))
  })

  it("keeps the question when the day's limit is reached", async () => {
    mockSession()
    server.use(http.post(`${BASE}/assistant/messages`, () => HttpResponse.json({ error: 'QuotaExceeded', message: 'Daily assistant limit reached.' }, { status: 429 })))
    const user = userEvent.setup()
    renderApp(<Harness onDraft={() => {}} />)
    await user.type(await screen.findByLabelText('Escribe tu pregunta'), '¿Y mis metas?{Enter}')
    expect(await screen.findByText('Llegaste al límite de mensajes de hoy. Vuelve mañana.')).toBeInTheDocument()
    expect(screen.getByLabelText('Escribe tu pregunta')).toHaveValue('¿Y mis metas?')
  })
})
