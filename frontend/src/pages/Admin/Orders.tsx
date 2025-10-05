import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '../../components/AdminLayout'
import { fetchAdminOrders, updateAdminOrder } from '../../api/admin'
import Button from '../../components/Button'
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter'

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
const PAYMENT_STATUS_OPTIONS = ['pending', 'authorized', 'paid', 'failed', 'refunded']

export default function AdminOrders() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-orders'], queryFn: () => fetchAdminOrders({ page_size: 50 }) })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => updateAdminOrder(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  })

  const orders = data?.results ?? data ?? []
  const formatPrice = useCurrencyFormatter()

  return (
    <AdminLayout title="Orders">
      {isLoading ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">Loading orders…</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div key={order.id} className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold">Order #{order.id}</h3>
                <div className="text-xs text-neutral-500">Placed {new Date(order.placed_at).toLocaleString()}</div>
              </div>

              <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-neutral-500">Status</span>
                  <select
                    value={order.status}
                    onChange={e => updateMutation.mutate({ id: order.id, payload: { status: e.target.value } })}
                    className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-neutral-500">Payment</span>
                  <select
                    value={order.payment_status}
                    onChange={e => updateMutation.mutate({ id: order.id, payload: { payment_status: e.target.value } })}
                    className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    {PAYMENT_STATUS_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-neutral-500">Tracking number</span>
                  <input
                    defaultValue={order.tracking_number || ''}
                    onBlur={e => updateMutation.mutate({ id: order.id, payload: { tracking_number: e.target.value } })}
                    className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-neutral-500">Estimated delivery</span>
                  <input
                    type="date"
                    defaultValue={order.estimated_delivery_at ? order.estimated_delivery_at.substring(0, 10) : ''}
                    onBlur={e => updateMutation.mutate({ id: order.id, payload: { estimated_delivery_at: e.target.value || null } })}
                    className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
                <span>{order.items.length} items · {formatPrice(order.total_amount)}</span>
                <Button
                  variant="secondary"
                  onClick={() => updateMutation.mutate({ id: order.id, payload: { status: 'refunded' } })}
                >
                  Mark refunded
                </Button>
              </div>
            </div>
          ))}

          {orders.length === 0 && (
            <div className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">No orders yet.</div>
          )}
        </div>
      )}
    </AdminLayout>
  )
}
