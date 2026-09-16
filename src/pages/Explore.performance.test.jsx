import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Explore from './Explore'
import { AuthProvider } from '../context/AuthContext'

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

// Requisito no funcional: la búsqueda y el filtrado en Explore
// deben responder en menos de 3 segundos.
const MAX_RESPONSE_TIME_MS = 3000

function renderExplore() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Explore />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('Explore - rendimiento de búsqueda y filtrado', () => {
  it('la búsqueda por texto responde en menos de 3 segundos', async () => {
    const user = userEvent.setup()
    renderExplore()
    const searchInputs = screen.getAllByPlaceholderText(/search cameras, tools, gear/i)

    const start = performance.now()
    await user.type(searchInputs[0], 'drill')
    await screen.findByText('Results for "drill"')
    const duration = performance.now() - start

    console.log(`[perf] búsqueda por texto: ${duration.toFixed(1)}ms`)
    expect(duration).toBeLessThan(MAX_RESPONSE_TIME_MS)
  })

  it('el filtrado por categoría responde en menos de 3 segundos', async () => {
    const user = userEvent.setup()
    renderExplore()

    const start = performance.now()
    await user.click(screen.getByRole('button', { name: /tools/i }))
    await screen.findByText('Cordless drill, Bosch')
    const duration = performance.now() - start

    console.log(`[perf] filtrado por categoría: ${duration.toFixed(1)}ms`)
    expect(duration).toBeLessThan(MAX_RESPONSE_TIME_MS)
  })
})