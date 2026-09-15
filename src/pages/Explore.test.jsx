import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
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

function renderExplore() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Explore />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('Página Explore - búsqueda y filtrado', () => {
  it('muestra todos los artículos por defecto', () => {
    renderExplore()
    expect(screen.getByText('Recommended for you')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(20)
  })

  it('filtra artículos por término de búsqueda', async () => {
    const user = userEvent.setup()
    renderExplore()
    const searchInputs = screen.getAllByPlaceholderText(/search cameras, tools, gear/i)
    await user.type(searchInputs[0], 'drill')

    expect(await screen.findByText('Results for "drill"')).toBeInTheDocument()
    expect(screen.getByText('Cordless drill, Bosch')).toBeInTheDocument()
    expect(screen.queryByText('Trek mountain bike')).not.toBeInTheDocument()
  })

  it('filtra artículos por categoría', async () => {
    const user = userEvent.setup()
    renderExplore()
    await user.click(screen.getByRole('button', { name: /tools/i }))

    expect(screen.getByText('Cordless drill, Bosch')).toBeInTheDocument()
    expect(screen.queryByText('Trek mountain bike')).not.toBeInTheDocument()
  })

  it('limpia los filtros y vuelve a mostrar todo', async () => {
    const user = userEvent.setup()
    renderExplore()
    await user.click(screen.getByRole('button', { name: /tools/i }))
    await user.click(screen.getByRole('button', { name: /clear filters/i }))

    expect(screen.getByText('Recommended for you')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(20)
  })
})