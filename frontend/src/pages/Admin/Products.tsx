import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '../../components/AdminLayout'
import {
  fetchAdminProducts,
  updateAdminProduct,
  fetchAdminSuppliers,
  fetchAdminCategories,
  createAdminProduct,
} from '../../api/admin'
import Button from '../../components/Button'
import { formatCurrency } from '../../utils/number'

type ViewMode = 'table' | 'grid'

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Draft' },
]

export default function AdminProducts() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [view, setView] = useState<ViewMode>('table')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showForm, setShowForm] = useState(false)

  const productsQuery = useQuery({
    queryKey: ['admin-products', { search, statusFilter, supplierFilter }],
    queryFn: () =>
      fetchAdminProducts({
        page_size: 100,
        q: search || undefined,
        active: statusFilter === 'all' ? undefined : statusFilter === 'active' ? 'true' : 'false',
        supplier: supplierFilter !== 'all' ? supplierFilter : undefined,
      }),
    keepPreviousData: true,
  })

  const suppliersQuery = useQuery({ queryKey: ['admin-suppliers'], queryFn: fetchAdminSuppliers })
  const categoriesQuery = useQuery({ queryKey: ['admin-categories'], queryFn: fetchAdminCategories })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => updateAdminProduct(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  })

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createAdminProduct(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      setShowForm(false)
    },
  })

  const products = useMemo(() => {
    const results = productsQuery.data?.results ?? productsQuery.data ?? []
    return results
  }, [productsQuery.data])

  const suppliers = suppliersQuery.data?.results ?? suppliersQuery.data ?? []
  const categories = categoriesQuery.data?.results ?? categoriesQuery.data ?? []
  const anySelected = selected.size > 0

  const toggleSelection = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  const handleBulkStatus = (active: boolean) => {
    const ids = Array.from(selected)
    if (!ids.length) return
    Promise.all(ids.map(id => toggleStatusMutation.mutateAsync({ id, payload: { active } }))).finally(clearSelection)
  }

  return (
    <AdminLayout
      title="Products"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['admin-products'] })}>Refresh</Button>
          <Button onClick={() => setShowForm(true)}>New product</Button>
        </div>
      }
    >
      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">Search</label>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title or SKU"
              className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              {STATUS_FILTERS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">Supplier</label>
            <select
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="all">All suppliers</option>
              {suppliers.map((supplier: any) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {products.length} products
          </div>
          <div className="inline-flex rounded-full bg-neutral-900/5 p-1 dark:bg-neutral-700/50">
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${view === 'table' ? 'bg-white shadow dark:bg-neutral-900' : 'text-neutral-500'}`}
              onClick={() => setView('table')}
            >
              Table
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${view === 'grid' ? 'bg-white shadow dark:bg-neutral-900' : 'text-neutral-500'}`}
              onClick={() => setView('grid')}
            >
              Cards
            </button>
          </div>
        </div>
      </section>

      {anySelected && (
        <div className="flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-xs font-semibold text-primary-800 dark:border-primary-400/40 dark:bg-primary-500/10 dark:text-primary-200">
          <span>{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleBulkStatus(true)}>Activate</Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkStatus(false)}>Set draft</Button>
            <button className="text-xs font-semibold underline" onClick={clearSelection}>Clear</button>
          </div>
        </div>
      )}

      {view === 'table' ? (
        <section className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          {productsQuery.isLoading ? (
            <div className="px-6 py-8 text-sm text-neutral-500">Loading products…</div>
          ) : (
            <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={selected.size === products.length && products.length > 0} onChange={e => {
                      if (e.target.checked) {
                        setSelected(new Set(products.map((product: any) => product.id)))
                      } else {
                        clearSelection()
                      }
                    }} />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Product</th>
                  <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                  <th className="px-4 py-3 text-left font-semibold">Price</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Updated</th>
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {products.map((product: any) => (
                  <tr key={product.id} className="hover:bg-neutral-50 transition dark:hover:bg-neutral-800/50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggleSelection(product.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900 dark:text-neutral-50">{product.title}</div>
                      <div className="text-xs text-neutral-500">SKU {product.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">{product.supplier?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(product.base_price)}</td>
                    <td className="px-4 py-3">
                      <button
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${product.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700/50 dark:text-neutral-300'}`}
                        onClick={() => toggleStatusMutation.mutate({ id: product.id, payload: { active: !product.active } })}
                      >
                        {product.active ? 'Active' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">{product.updated_at ? new Date(product.updated_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => toggleStatusMutation.mutate({ id: product.id, payload: { active: !product.active } })}>
                        {product.active ? 'Disable' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {!products.length && !productsQuery.isLoading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-neutral-500">No products found for the current filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {productsQuery.isLoading ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">Loading products…</div>
          ) : (
            products.map((product: any) => (
              <article key={product.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{product.title}</h3>
                    <p className="text-xs text-neutral-500">SKU {product.sku}</p>
                  </div>
                  <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggleSelection(product.id)} />
                </div>
                <div className="mt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Supplier</span>
                    <span>{product.supplier?.name ?? '—'}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-neutral-500">Price</span>
                    <span className="font-semibold">{formatCurrency(product.base_price)}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700/50 dark:text-neutral-300'}`}>
                    {product.active ? 'Active' : 'Draft'}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => toggleStatusMutation.mutate({ id: product.id, payload: { active: !product.active } })}>
                    Toggle
                  </Button>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {showForm && (
        <ProductFormModal
          categories={categories}
          suppliers={suppliers}
          onClose={() => setShowForm(false)}
          onSubmit={payload => createMutation.mutate(payload)}
          isSubmitting={createMutation.isPending}
        />
      )}
    </AdminLayout>
  )
}

type ProductFormModalProps = {
  categories: any[]
  suppliers: any[]
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => void
  isSubmitting: boolean
}

function ProductFormModal({ categories, suppliers, onClose, onSubmit, isSubmitting }: ProductFormModalProps) {
  const [title, setTitle] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [supplierId, setSupplierId] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title || !sku || !price || !categoryId) return
    const payload = {
      title,
      slug: slugify(title),
      sku,
      base_price: parseFloat(price),
      category: Number(categoryId),
      supplier: supplierId ? Number(supplierId) : null,
      active: true,
    }
    onSubmit(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Create product</h2>
            <p className="text-xs text-neutral-500">Define the essentials and iterate later.</p>
          </div>
          <button type="button" className="text-sm text-neutral-500" onClick={onClose}>Close</button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Title</span>
            <input value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">SKU</span>
            <input value={sku} onChange={e => setSku(e.target.value)} required className="mt-1 w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Base price</span>
            <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required className="mt-1 w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Category</span>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="mt-1 w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
              <option value="">Select category</option>
              {categories.map((category: any) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Supplier</span>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
              <option value="">Unassigned</option>
              {suppliers.map((supplier: any) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create product'}</Button>
        </div>
      </form>
    </div>
  )
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
