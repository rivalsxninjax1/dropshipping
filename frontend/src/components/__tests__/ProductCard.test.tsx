import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import ProductCard from '../ProductCard'

describe('ProductCard', () => {
  it('shows title and price', () => {
    render(<MemoryRouter><ProductCard product={{ id: 1, title: 'T', slug: 't', description: '', base_price: '9.99', sku: 'SKU', images: '', category: { id: 1, name: 'C', slug: 'c', parent: null }, supplier: null, created_at: '', updated_at: '' }} /></MemoryRouter>)
    expect(screen.getByText('T')).toBeInTheDocument()
    expect(screen.getByText('Rs 1,334')).toBeInTheDocument()
  })
})
