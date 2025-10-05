import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '../../components/AdminLayout'
import { fetchAdminProducts, updateAdminProduct } from '../../api/admin'
import Button from '../../components/Button'
import { formatCurrency } from '../../utils/number'

export default function AdminProducts() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const productsQuery = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => fetchAdminProducts({ page_size: 100 }),
  })

  const toggleMutation = useMutation({
    mutationFn: (product: any) => updateAdminProduct(product.id, { active: !product.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  })

  const products = useMemo(() => {
    const results = productsQuery.data?.results ?? productsQuery.data ?? []
    if (!search) return results
    const q = search.toLowerCase()
    return results.filter((item: any) => item.title.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q))
  }, [productsQuery.data, search])

  return (
    <AdminLayout title="Products">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products"
          className="w-full max-w-sm rounded border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <Button variant="secondary">Bulk import</Button>
      </div>

      {productsQuery.isLoading ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">Loading products…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Title</th>
                <th className="px-3 py-2 text-left font-semibold">SKU</th>
                <th className="px-3 py-2 text-left font-semibold">Price</th>
                <th className="px-3 py-2 text-left font-semibold">Active</th>
                <th className="px-3 py-2 text-left font-semibold">Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {products.map((product: any) => (
                <tr key={product.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                  <td className="px-3 py-2">{product.title}</td>
                  <td className="px-3 py-2 text-neutral-500">{product.sku}</td>
                  <td className="px-3 py-2 font-medium">{formatCurrency(product.base_price)}</td>
                  <td className="px-3 py-2">
                    <button
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${product.active ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-200 text-neutral-600'}`}
                      onClick={() => toggleMutation.mutate(product)}
                    >
                      {product.active ? 'Active' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-neutral-500">{product.supplier?.name || '—'}</td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-neutral-500">No products found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
