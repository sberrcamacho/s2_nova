import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils/render'
import { GoogleSignInButton } from '@/auth/GoogleSignInButton'

// A parent that re-renders on every keystroke and passes a new callback each
// time, like Login and Crear cuenta do.
function Host({ onToken }: { onToken: (token: string) => void }) {
  const [text, setText] = useState('')
  return (
    <>
      <input aria-label="campo" value={text} onChange={(e) => setText(e.target.value)} />
      <GoogleSignInButton onToken={(token) => onToken(`${text}:${token}`)} />
    </>
  )
}

describe('GoogleSignInButton', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete window.google
  })

  it('initializes Google once however often the parent re-renders, and calls the latest callback', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-id')
    let callback: ((response: { credential: string }) => void) | undefined
    const initialize = vi.fn((config: { callback: (response: { credential: string }) => void }) => {
      callback = config.callback
    })
    window.google = { accounts: { id: { initialize, renderButton: vi.fn() } } }
    const onToken = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<Host onToken={onToken} />)

    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1))
    await user.type(screen.getByLabelText('campo'), 'abc')
    expect(initialize).toHaveBeenCalledTimes(1)

    callback!({ credential: 'tok' })
    expect(onToken).toHaveBeenCalledWith('abc:tok')
  })
})
