import { NavLink, Outlet } from 'react-router-dom'
import { ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/auth'

type NavItem = {
  to: string
  label: string
  icon: string
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊', roles: ['admin', 'staff'] },
  { to: '/admin/products', label: 'Products', icon: '📦', roles: ['admin', 'staff', 'vendor'] },
  { to: '/admin/categories', label: 'Categories', icon: '🗂️', roles: ['admin', 'staff'] },
  { to: '/admin/orders', label: 'Orders', icon: '📮', roles: ['admin', 'staff'] },
  { to: '/admin/users', label: 'Users', icon: '👥', roles: ['admin'] },
  { to: '/admin/suppliers', label: 'Suppliers', icon: '🤝', roles: ['admin'] },
  { to: '/admin/coupons', label: 'Coupons', icon: '🎟️', roles: ['admin', 'staff'] },
  { to: '/admin/content', label: 'CMS & Content', icon: '📝', roles: ['admin', 'staff'] },
  { to: '/admin/campaigns', label: 'Campaigns', icon: '📧', roles: ['admin', 'staff'] },
]

export default function AdminLayout({ title, actions, children }: { title?: string; actions?: ReactNode; children?: ReactNode }) {
  const { t } = useTranslation()
  const user = useAuthStore(s => s.user)
  const role = (user?.role ?? (user?.is_staff ? 'staff' : 'customer')).toLowerCase()

  const filteredNav = useMemo(
    () => NAV_ITEMS.filter(item => item.roles.some(r => r.toLowerCase() === role)),
    [role],
  )

  return (
    <div className="lg:flex">
      <aside className="hidden w-64 border-r bg-white lg:block dark:border-neutral-800 dark:bg-neutral-900">
        <div className="p-6">
          <h1 className="text-xl font-semibold">Admin Console</h1>
          <p className="mt-1 text-xs text-neutral-500">Manage storefront operations</p>
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-neutral-100 px-3 py-2 text-xs dark:bg-neutral-800">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-100 text-base dark:bg-primary-500/20">
              {(user?.first_name?.[0] ?? user?.email?.[0] ?? 'A').toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-sm">{user?.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : user?.email}</div>
              <div className="mt-0.5 inline-flex rounded-full bg-neutral-900/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500 dark:bg-neutral-700/50 dark:text-neutral-300">
                {role}
              </div>
            </div>
          </div>
        </div>
        <nav className="space-y-1 px-3 pb-6 text-sm">
          {filteredNav.map(item => (
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
