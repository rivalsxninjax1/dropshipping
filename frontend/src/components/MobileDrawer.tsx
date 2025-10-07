import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/auth'
import Button from './Button'

const links = [
  { label: 'nav.home', fallback: 'Home', href: '/' },
  { label: 'nav.products', fallback: 'Products', href: '/products' },
  { label: 'nav.about', fallback: 'About', href: '/about' },
  { label: 'nav.contact', fallback: 'Contact', href: '/contact' },
]

type MobileDrawerProps = {
  open: boolean
  onClose: () => void
}

export default function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { t } = useTranslation()
  const authState = useAuthStore(s => ({ accessToken: s.accessToken, user: s.user }))
  const isAuthenticated = Boolean(authState.accessToken)
  const isStaff = Boolean(authState.user?.is_staff)

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-out duration-300"
              enterFrom="translate-x-[-100%]"
              enterTo="translate-x-0"
              leave="transform transition ease-in duration-200"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-[-100%]"
            >
              <Dialog.Panel className="pointer-events-auto flex h-full max-w-sm flex-col bg-white/90 p-6 pt-10 shadow-glass backdrop-blur-xl dark:bg-neutral-950/85">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary text-lg font-bold text-white">ds</span>
                    <span className="font-heading text-lg font-semibold text-neutral-900 dark:text-white">VastraStore</span>
                  </div>
                  <button onClick={onClose} className="text-sm text-neutral-500 hover:text-neutral-800" aria-label="Close menu">✕</button>
                </div>

                <div className="mt-8 space-y-4">
                  <nav className="space-y-2 text-base">
                    {links.map(link => (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={onClose}
                        className="block rounded-2xl bg-white/40 px-4 py-3 text-neutral-700 shadow-card transition hover:bg-primary-50 hover:text-primary-600 dark:bg-neutral-900/50 dark:text-neutral-100"
                      >
                        {t(link.label, { defaultValue: link.fallback })}
                      </Link>
                    ))}
                    {isAuthenticated && (
                      <Link
                        to="/account/orders"
                        onClick={onClose}
                        className="block rounded-2xl bg-white/40 px-4 py-3 text-neutral-700 shadow-card transition hover:bg-primary-50 hover:text-primary-600 dark:bg-neutral-900/50 dark:text-neutral-100"
                      >
                        {t('nav.orders', { defaultValue: 'Orders' })}
                      </Link>
                    )}
                    {isStaff && (
                      <Link
                        to="/admin/dashboard"
                        onClick={onClose}
                        className="block rounded-2xl bg-white/40 px-4 py-3 text-neutral-700 shadow-card transition hover:bg-primary-50 hover:text-primary-600 dark:bg-neutral-900/50 dark:text-neutral-100"
                      >
                        Admin
                      </Link>
                    )}
                  </nav>

                  <div className="rounded-3xl bg-gradient-secondary p-5 text-white">
                    <h3 className="font-heading text-lg font-semibold">{t('drawer.ctaTitle', 'Unlock weekly drops')}</h3>
                    <p className="mt-2 text-sm text-white/80">{t('drawer.ctaBody', 'Join 20k+ trendsetters getting VIP pricing and early drops direct to their inbox.')}</p>
                    <Link to="/register" onClick={onClose} className="mt-4 inline-flex">
                      <Button variant="accent">{t('actions.signup')}</Button>
                    </Link>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
