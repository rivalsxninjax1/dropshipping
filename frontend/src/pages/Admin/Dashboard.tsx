import { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminLayout from '../../components/AdminLayout'
import { fetchAdminMetrics, fetchLowStock } from '../../api/admin'
import { formatCurrency } from '../../utils/number'
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts'
import Button from '../../components/Button'

export default function AdminDashboard() {
  const metricsQuery = useQuery({ queryKey: ['admin-metrics'], queryFn: fetchAdminMetrics })
  const lowStockQuery = useQuery({ queryKey: ['low-stock'], queryFn: fetchLowStock })

  const metrics = metricsQuery.data || {
    revenue: 0,
    orders: 0,
    conversionRate: 0,
    abandonedCarts: 0,
    weekly: [],
    byPayment: [],
  }

  return (
    <AdminLayout
      title="Dashboard"
      actions={
        <div className="flex gap-2">
          <Button variant="secondary">Export CSV</Button>
          <Button>Send campaign</Button>
        </div>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Revenue" value={formatCurrency(metrics.revenue)} trend="▲ 14%" />
        <StatCard title="Orders" value={metrics.orders} trend="▲ 6%" />
        <StatCard title="Conversion" value={`${metrics.conversionRate}%`} trend="▼ 1%" />
        <StatCard title="Abandoned carts" value={metrics.abandonedCarts} trend="▼ 3%" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title="Sales overview">
          <ResponsiveContainer width="100%" height={240}>
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

        <DashboardCard title="Payment mix">
          <ResponsiveContainer width="100%" height={240}>
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

      <section className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title="Low stock alerts">
          {lowStockQuery.isLoading ? (
            <div className="text-sm text-neutral-500">Loading…</div>
          ) : (
            <ul className="space-y-3 text-sm">
              {(lowStockQuery.data ?? []).map(item => (
                <li key={item.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-neutral-500">SKU: {item.sku}</div>
                  </div>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">{item.quantity} left</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard title="Quick actions">
          <div className="grid gap-3 text-sm">
            <Button variant="secondary">Sync suppliers</Button>
            <Button variant="secondary">Approve refunds</Button>
            <Button variant="secondary">Review new products</Button>
          </div>
        </DashboardCard>
      </section>
    </AdminLayout>
  )
}

function StatCard({ title, value, trend }: { title: string; value: string | number; trend: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-emerald-500">{trend}</p>
    </div>
  )
}

function DashboardCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  )
}
