import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Header from '../Header'
import { useAuthStore } from '../../store/auth'

vi.mock('../../api', () => ({
  getCart: () => Promise.resolve({ items: [], total: '0.00' }),
  clearCart: () => Promise.resolve(),
}))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
})

describe('Header', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null })
  })

  it('renders brand and cart badge', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      </QueryClientProvider>
    )
    expect(screen.getByText('brand')).toBeInTheDocument()
    expect(screen.getByLabelText('Cart')).toBeInTheDocument()
  })
})
