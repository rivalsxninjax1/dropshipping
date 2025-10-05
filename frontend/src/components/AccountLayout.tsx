import { NavLink } from 'react-router-dom'
import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const links = [
  { to: '/account/profile', key: 'profile' },
  { to: '/account/addresses', key: 'addresses' },
  { to: '/account/wishlist', key: 'wishlist' },
  { to: '/account/orders', key: 'orders' },
]

export default function AccountLayout({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
      <aside className="mb-6 lg:mb-0">
        <nav className="rounded-xl border bg-white p-4 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="mb-3 text-base font-semibold">{t('account.title')}</h2>
          <ul className="space-y-1">
            {links.map(link => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) => `flex rounded-md px-3 py-2 transition ${isActive ? 'bg-primary-600 text-white shadow-sm' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                >
                  {t(`nav.${link.key}` as 'nav')}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <section>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-neutral-600 dark:text-neutral-300">{description}</p>}
        </div>
        <div className="space-y-6">{children}</div>
      </section>
    </div>
  )
}
