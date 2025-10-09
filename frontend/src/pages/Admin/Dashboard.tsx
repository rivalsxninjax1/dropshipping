import { ReactNode, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminLayout from '../../components/AdminLayout'
import { fetchAdminMetrics, fetchLowStock, fetchAdminActionLogs } from '../../api/admin'
import { formatCurrency } from '../../utils/number'
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts'
import Button from '../../components/Button'

const DEFAULT_METRICS = {
  revenue: 0,
  orders: 0,
  conversionRate: 0,
  abandonedCarts: 0,
  weekly: [] as { label: string; value: number }[],
  byPayment: [] as { provider: string; amount: number }[],
}

export default function AdminDashboard() {
  const metricsQuery = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: fetchAdminMetrics,
    refetchInterval: 45_000,
    refetchOnWindowFocus: false,
  })
  const lowStockQuery = useQuery({
    queryKey: ['admin-low-stock'],
    queryFn: fetchLowStock,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
  })
  const activityQuery = useQuery({
    queryKey: ['admin-activity'],
    queryFn: () => fetchAdminActionLogs({ page_size: 8 }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  })

  const metrics = metricsQuery.data ?? DEFAULT_METRICS
  const lowStock = (lowStockQuery.data ?? []).slice(0, 6)
  const activity = activityQuery.data?.results ?? activityQuery.data ?? []

  const summary = useMemo(
    () => (
      [
        {
          title: 'Net revenue',
          value: formatCurrency(metrics.revenue),
          hint: 'Last 30 days',
        },
        {
          title: 'Orders processed',
          value: metrics.orders,
          hint: `${metrics.conversionRate}% conversion`,
        },
        {
          title: 'Abandoned carts',
          value: metrics.abandonedCarts,
          hint: 'Recovery automation running',
        },
        {
          title: 'Latest activity',
          value: activity.length ? `${activity[0].action} ${activity[0].resource}` : 'No recent actions',
          hint: activity.length && activity[0].created_at ? new Date(activity[0].created_at).toLocaleTimeString() : '',
        },
      ]
    ),
    [metrics, activity],
  )

  return (
    <AdminLayout
      title="Operations Overview"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => metricsQuery.refetch()} disabled={metricsQuery.isFetching}>
            Refresh
          </Button>
          <Button>Schedule sync</Button>
        </div>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map(item => (
          <StatCard key={item.title} title={item.title} value={item.value} hint={item.hint} loading={metricsQuery.isLoading} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <DashboardCard title="Sales performance" className="lg:col-span-2" footer={<LiveBadge />}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={metrics.weekly}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis dataKey="label" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Area type="monotone" dataKey="value" stroke="#4f46e5" fill="url(#colorSales)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </DashboardCard>

        <DashboardCard title="Payment mix" className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={metrics.byPayment}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis dataKey="provider" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashboardCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <DashboardCard title="Low stock watchlist" className="lg:col-span-1" footer={<span className="text-xs text-neutral-500">Threshold &lt;= safety + 5 units</span>}>
          {lowStockQuery.isLoading ? (
            <div className="text-sm text-neutral-500">Updating inventory…</div>
          ) : (
            <ul className="space-y-3 text-sm">
              {lowStock.map(item => (
                <li key={item.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-50">{item.title}</div>
                    <div className="text-xs text-neutral-500">SKU {item.sku}</div>
                  </div>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600 dark:bg-red-500/20 dark:text-red-200">{item.quantity} left</span>
                </li>
              ))}
              {!lowStock.length && <li className="text-xs text-neutral-500">All stocked goods are healthy.</li>}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard title="Live admin activity" className="lg:col-span-2">
          {activityQuery.isLoading ? (
            <div className="text-sm text-neutral-500">Loading audit trail…</div>
          ) : (
            <ul className="divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
              {activity.map((entry: any) => (
                <li key={entry.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{entry.action} · {entry.resource}</div>
                    <div className="text-xs text-neutral-500">By {entry.actor_email ?? 'system'} · {entry.object_pk || '—'}</div>
                  </div>
                  <span className="text-xs text-neutral-400">{entry.created_at ? new Date(entry.created_at).toLocaleTimeString() : ''}</span>
                </li>
              ))}
              {!activity.length && <li className="py-6 text-center text-xs text-neutral-500">No recent admin operations.</li>}
            </ul>
          )}
        </DashboardCard>
      </section>
    </AdminLayout>
  )
}

function StatCard({ title, value, hint, loading }: { title: string; value: string | number; hint?: string; loading?: boolean }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm transition dark:border-neutral-700 dark:bg-neutral-900">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold">{loading ? '—' : value}</p>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  )
}

function DashboardCard({ title, children, footer, className }: { title: string; children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {footer}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function LiveBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      Live feed
    </div>
  )
}
