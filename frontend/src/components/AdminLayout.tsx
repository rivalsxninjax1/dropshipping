import { NavLink, Outlet } from 'react-router-dom'
import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/auth'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/products', label: 'Products', icon: '📦' },
  { to: '/admin/suppliers', label: 'Suppliers', icon: '🤝' },
  { to: '/admin/orders', label: 'Orders', icon: '📮' },
  { to: '/admin/coupons', label: 'Coupons', icon: '🎟️' },
  { to: '/admin/content', label: 'CMS & Blog', icon: '📝' },
  { to: '/admin/campaigns', label: 'Campaigns', icon: '📧' },
]

export default function AdminLayout({ title, actions, children }: { title?: string; actions?: ReactNode; children?: ReactNode }) {
  const { t } = useTranslation()
  const isStaff = !!useAuthStore(s => s.user?.is_staff)

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center text-sm text-neutral-600 dark:text-neutral-300">
        <div className="rounded-xl border border-dashed bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
          <h1 className="text-xl font-semibold">Admin Area</h1>
          <p className="mt-2">You need staff access to view this dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lg:flex">
      <aside className="hidden w-64 border-r bg-white lg:block dark:border-neutral-800 dark:bg-neutral-900">
        <div className="p-6">
          <h1 className="text-xl font-semibold">Admin</h1>
          <p className="mt-1 text-xs text-neutral-500">Manage storefront operations</p>
        </div>
        <nav className="space-y-1 px-3 pb-6 text-sm">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 transition ${isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 bg-neutral-50 px-4 py-6 dark:bg-neutral-900/60 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{title || 'Dashboard'}</h2>
            <p className="text-sm text-neutral-500">Automated dropshipping control center</p>
          </div>
          {actions}
        </header>
        <div className="space-y-6">
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  )
}
