import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '../../components/AdminLayout'
import { fetchAdminOrders, updateAdminOrder, refundAdminOrder } from '../../api/admin'
import Button from '../../components/Button'
import { formatCurrency } from '../../utils/number'

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
const PAYMENT_OPTIONS = ['pending', 'authorized', 'paid', 'failed', 'refunded']

export default function AdminOrders() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [search, setSearch] = useState('')

  const ordersQuery = useQuery({
    queryKey: ['admin-orders', { statusFilter, paymentFilter, search }],
    queryFn: () =>
      fetchAdminOrders({
        page_size: 50,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        payment_status: paymentFilter !== 'all' ? paymentFilter : undefined,
        q: search || undefined,
      }),
    keepPreviousData: true,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => updateAdminOrder(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  })

  const refundMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount?: number }) => refundAdminOrder(id, amount ? { amount } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  })

  const orders = ordersQuery.data?.results ?? ordersQuery.data ?? []

  const summary = useMemo(() => {
    const total = orders.length
    const shipped = orders.filter((order: any) => order.status === 'shipped' || order.status === 'delivered').length
    const cancelled = orders.filter((order: any) => order.status === 'cancelled').length
    const refunded = orders.filter((order: any) => order.payment_status === 'refunded').length
    return [
      { label: 'Open orders', value: total - shipped - cancelled - refunded },
      { label: 'In transit/delivered', value: shipped },
      { label: 'Cancelled', value: cancelled },
      { label: 'Refunded', value: refunded },
    ]
  }, [orders])

  return (
    <AdminLayout
      title="Orders"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['admin-orders'] })}>Refresh</Button>
        </div>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map(item => (
          <div key={item.label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            <div className="text-xs uppercase tracking-wide text-neutral-500">{item.label}</div>
            <div className="mt-2 text-2xl font-semibold">{item.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</span>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Payment</span>
            <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <option value="all">All payments</option>
              {PAYMENT_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order ID or email" className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        {ordersQuery.isLoading ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">Loading orders…</div>
        ) : (
          orders.map((order: any) => (
            <article key={order.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">Order #{order.id}</h3>
                  <p className="text-xs text-neutral-500">Placed {order.placed_at ? new Date(order.placed_at).toLocaleString() : 'Unknown'}</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="rounded-full bg-neutral-100 px-3 py-1 font-semibold text-neutral-600 dark:bg-neutral-700/50 dark:text-neutral-200">{order.items.length} item(s)</span>
                  <span className="rounded-full bg-primary-100 px-3 py-1 font-semibold text-primary-700 dark:bg-primary-500/20 dark:text-primary-200">{formatCurrency(order.total_amount)}</span>
                </div>
              </header>

              <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
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
                    {PAYMENT_OPTIONS.map(option => (
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

              <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
                <div>
                  Customer: {order.user?.email ?? 'Guest'}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refundMutation.mutate({ id: order.id })}
                    disabled={refundMutation.isPending}
                  >
                    Refund order
                  </Button>
                </div>
              </footer>
            </article>
          ))
        )}

        {!ordersQuery.isLoading && !orders.length && (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
            No orders match the current filters.
          </div>
        )}
      </section>
    </AdminLayout>
  )
}
