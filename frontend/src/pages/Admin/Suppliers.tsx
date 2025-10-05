import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '../../components/AdminLayout'
import { fetchAdminSuppliers, triggerSupplierSync } from '../../api/admin'
import Button from '../../components/Button'
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter'

export default function AdminSuppliers() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-suppliers'], queryFn: fetchAdminSuppliers })
  const syncMutation = useMutation({
    mutationFn: (id: number) => triggerSupplierSync(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-suppliers'] }),
  })

  const suppliers = data?.results ?? data ?? []
  const formatPrice = useCurrencyFormatter()

  return (
    <AdminLayout title="Suppliers">
      {isLoading ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">Loading suppliers…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Name</th>
                <th className="px-3 py-2 text-left font-semibold">Contact</th>
                <th className="px-3 py-2 text-left font-semibold">Markup</th>
                <th className="px-3 py-2 text-left font-semibold">Last sync</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {suppliers.map((supplier: any) => (
                <tr key={supplier.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                  <td className="px-3 py-2 font-medium">{supplier.name}</td>
                  <td className="px-3 py-2 text-neutral-500">{supplier.contact_email}</td>
                  <td className="px-3 py-2 text-neutral-500">
                    {supplier.markup_type === 'percent'
                      ? `${supplier.markup_value}%`
                      : formatPrice(supplier.markup_value)}
                  </td>
                  <td className="px-3 py-2 text-neutral-500">{supplier.last_synced_at ? new Date(supplier.last_synced_at).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="secondary"
                      onClick={() => syncMutation.mutate(supplier.id)}
                      disabled={syncMutation.isPending}
                    >
                      Sync
                    </Button>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-neutral-500">No suppliers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
