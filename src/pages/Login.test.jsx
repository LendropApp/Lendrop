import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'
import { AuthProvider } from '../context/AuthContext'

const mockSignInWithPassword = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
    },
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('Flujo de autenticación - Login', () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset()
    mockNavigate.mockReset()
    localStorage.clear()
  })

  it('renderiza los campos de email y contraseña', () => {
    renderLogin()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('inicia sesión correctamente y redirige a /explore', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null })
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'supersecret')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'supersecret',
      })
    })
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/explore', { replace: true })
    })
  })

  it('muestra un mensaje de error con credenciales inválidas', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    })
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/email address/i), 'wrong@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText(/incorrect email or password/i)).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})