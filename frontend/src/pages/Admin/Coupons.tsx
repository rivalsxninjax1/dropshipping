import { FormEvent, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '../../components/AdminLayout'
import { fetchAdminCoupons, createAdminCoupon, updateAdminCoupon, deleteAdminCoupon } from '../../api/admin'
import Button from '../../components/Button'

export default function AdminCoupons() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-coupons'], queryFn: fetchAdminCoupons })
  const coupons = data?.results ?? data ?? []

  const [form, setForm] = useState({ code: '', discount_type: 'percent', value: '10', min_order_total: '0', usage_limit: 0, per_user_limit: 0, expires_at: '' })

  const createMutation = useMutation({
    mutationFn: () => createAdminCoupon(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] })
      setForm({ code: '', discount_type: 'percent', value: '10', min_order_total: '0', usage_limit: 0, per_user_limit: 0, expires_at: '' })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (coupon: any) => updateAdminCoupon(coupon.id, { is_active: !coupon.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminCoupon(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <AdminLayout title="Coupons">
      <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-neutral-500">Code</span>
            <input value={form.code} onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))} className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-neutral-500">Type</span>
            <select value={form.discount_type} onChange={e => setForm(prev => ({ ...prev, discount_type: e.target.value }))} className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800">
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-neutral-500">Value</span>
            <input type="number" value={form.value} onChange={e => setForm(prev => ({ ...prev, value: e.target.value }))} className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-neutral-500">Min order</span>
            <input type="number" value={form.min_order_total} onChange={e => setForm(prev => ({ ...prev, min_order_total: e.target.value }))} className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-neutral-500">Usage limit</span>
            <input type="number" value={form.usage_limit} onChange={e => setForm(prev => ({ ...prev, usage_limit: Number(e.target.value) }))} className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-neutral-500">Per user</span>
            <input type="number" value={form.per_user_limit} onChange={e => setForm(prev => ({ ...prev, per_user_limit: Number(e.target.value) }))} className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-neutral-500">Expires at</span>
            <input type="date" value={form.expires_at} onChange={e => setForm(prev => ({ ...prev, expires_at: e.target.value }))} className="rounded border px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800" />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating…' : 'Create coupon'}</Button>
        </div>
      </form>

      {isLoading ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">Loading coupons…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Code</th>
                <th className="px-3 py-2 text-left font-semibold">Type</th>
                <th className="px-3 py-2 text-left font-semibold">Value</th>
                <th className="px-3 py-2 text-left font-semibold">Active</th>
                <th className="px-3 py-2 text-left font-semibold">Expires</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {coupons.map((coupon: any) => (
                <tr key={coupon.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                  <td className="px-3 py-2 font-medium">{coupon.code}</td>
                  <td className="px-3 py-2 text-neutral-500">{coupon.discount_type}</td>
                  <td className="px-3 py-2">{coupon.value}</td>
                  <td className="px-3 py-2">
                    <button
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${coupon.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-200 text-neutral-600'}`}
                      onClick={() => toggleMutation.mutate(coupon)}
                    >
                      {coupon.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-neutral-500">{coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="outline" onClick={() => deleteMutation.mutate(coupon.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-neutral-500">No coupons configured.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
