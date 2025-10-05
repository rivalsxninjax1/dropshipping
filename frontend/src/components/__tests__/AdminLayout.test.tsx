import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminLayout from '../AdminLayout'
import { useAuthStore } from '../../store/auth'

describe('AdminLayout', () => {
afterEach(() => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null })
    if ('persist' in useAuthStore) {
      // @ts-expect-error Zustand persist helper exposed at runtime
      useAuthStore.persist?.clearStorage?.()
    }
  })

  it('requires staff access', () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null })
    render(
      <MemoryRouter>
        <AdminLayout title="Dashboard" />
      </MemoryRouter>
    )
    expect(screen.getByText(/need staff access/i)).toBeInTheDocument()
  })

  it('shows navigation for staff users', () => {
    useAuthStore.setState({ accessToken: 'token', refreshToken: 'refresh', user: { id: 1, email: 'admin@example.com', is_staff: true } })
    render(
      <MemoryRouter>
        <AdminLayout title="Dashboard" />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: /Products/i })).toBeInTheDocument()
    expect(screen.getByText('Products')).toBeInTheDocument()
  })
})
