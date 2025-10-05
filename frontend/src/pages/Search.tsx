import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchProducts } from '../api'
import ProductCard from '../components/ProductCard'

function useQueryString() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export default function Search() {
  const qs = useQueryString()
  const q = qs.get('q') || ''
  const { data } = useQuery({ queryKey: ['search', q], queryFn: () => fetchProducts({ search: q, page_size: 24 }), enabled: !!q })
  const items = data?.results ?? []
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Search: {q}</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}

