import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { ThemeProvider } from '@/state/ThemeContext'
import { ToastProvider } from '@/state/ToastContext'
import { AuthProvider } from '@/state/AuthContext'

// Full provider stack minus AppDataProvider (only Overview/Transactions need
// it, and it fetches transactions+budgets on mount — pages under test here
// don't need that data available).
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>{ui}</AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}
