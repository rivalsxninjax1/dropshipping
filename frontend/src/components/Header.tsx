import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useCartStore } from '../store/cart'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { clearCart, getCart, searchSuggestions } from '../api'
import { useUIStore } from '../store/ui'
import MobileDrawer from './MobileDrawer'
import CartSidebar from './CartSidebar'
import Button from './Button'
import {
  Bars3Icon,
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { motion, useScroll } from 'framer-motion'

function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return { dark, setDark }
}

const navItems = [
  { label: 'nav.home', fallback: 'Home', href: '/' },
  { label: 'nav.products', fallback: 'Shop', href: '/products' },
  { label: 'nav.about', fallback: 'About', href: '/about' },
  { label: 'nav.contact', fallback: 'Contact', href: '/contact' },
  { label: 'nav.trackOrder', fallback: 'Track order', href: '/track-order' },
]

export default function Header() {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const unsubscribe = scrollY.on('change', latest => {
      setScrolled(latest > 12)
    })
    return () => unsubscribe()
  }, [scrollY])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { dark, setDark } = useTheme()
  const accessToken = useAuthStore(s => s.accessToken)
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const isAuthenticated = Boolean(accessToken)
  const isStaff = Boolean(user?.is_staff)

  const openCart = useUIStore(s => s.openCart)
  const cartStoreItems = useCartStore(s => s.items)

  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['cart'], queryFn: getCart })
  const cartItems = useMemo(() => data?.items ?? [], [data?.items])
  const cartCount = useMemo(
    () => (cartItems.length ? cartItems : cartStoreItems).reduce((total, item: any) => total + (item.quantity || 0), 0),
    [cartItems, cartStoreItems]
  )

  useEffect(() => {
    const id = setTimeout(async () => {
      if (!query.trim()) return setSuggestions([])
      const response = await searchSuggestions(query)
      setSuggestions(response)
    }, 220)
    return () => clearTimeout(id)
  }, [query])

  const handleSubmit = (value?: string) => {
    const term = value ?? query
    if (!term) return
    navigate(`/search?q=${encodeURIComponent(term)}`)
    setSuggestions([])
  }

  const handleLogout = async () => {
    try {
      await clearCart()
      qc.setQueryData(['cart'], { items: [], total: '0.00' })
    } catch {}
    logout()
    navigate('/')
  }

  return (
    <>
      <motion.header
        className={clsx(
          'sticky top-0 z-50 border-b border-white/40 bg-white/70 backdrop-blur-xl transition-all duration-300 dark:border-neutral-800 dark:bg-neutral-950/85 dark:text-white',
          scrolled ? 'shadow-glass' : 'shadow-none'
        )}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-4">
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/40 text-neutral-700 shadow-card backdrop-blur lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Toggle navigation"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <Link to="/" className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary text-[18px] font-bold text-white shadow-glow">ds</span>
              <div className="hidden flex-col leading-tight sm:flex">
                <span className="font-heading text-lg font-semibold text-neutral-900">VastraStore</span>
                <span className="text-xs uppercase tracking-[0.4em] text-neutral-400">Designer's Choice</span>
              </div>
            </Link>

            <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-600 lg:flex">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="relative inline-flex items-center gap-1 px-1 py-1 transition hover:text-primary-600"
                >
                  <span>{t(item.label, { defaultValue: item.fallback })}</span>
                  <span className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 rounded-full bg-gradient-primary transition-transform duration-300 hover:scale-x-100" />
                </Link>
              ))}
              {isAuthenticated && (
                <Link to="/account/orders" className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                  {t('nav.orders', { defaultValue: 'Orders' })}
                </Link>
              )}
              {isStaff && (
                <Link to="/admin/dashboard" className="text-xs uppercase tracking-[0.3em] text-neutral-400 hover:text-neutral-700">
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="relative hidden flex-1 items-center lg:flex">
            <label className="sr-only" htmlFor="site-search">
              {t('search.placeholder')}
            </label>
            <div className="relative w-full">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
              <input
                id="site-search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') handleSubmit()
                }}
                className="h-11 w-full rounded-full border border-white/30 bg-white/70 pl-12 pr-16 text-sm text-neutral-700 shadow-inner backdrop-blur focus:border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-200"
                placeholder={t('search.placeholder')}
              />
              <Button
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => handleSubmit()}
              >
                {t('actions.search')}
              </Button>
            </div>
            {suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-12 z-20 rounded-2xl border border-neutral-100 bg-white/90 p-2 shadow-glass backdrop-blur">
                {suggestions.map((item, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => handleSubmit(item)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-neutral-600 transition hover:bg-neutral-100"
                    >
                      <span>{item}</span>
                      <span className="text-xs text-neutral-400">↵</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm font-medium">
            <div className="flex items-center gap-2 rounded-full bg-white/60 px-2 py-1 shadow-inner">
              <select
                value={i18n.resolvedLanguage || i18n.language}
                aria-label={t('language.label')}
                onChange={event => i18n.changeLanguage(event.target.value)}
                className="rounded-full bg-transparent px-2 py-1 text-xs text-neutral-500 focus:outline-none"
              >
                <option value="en">EN</option>
                <option value="ne">ने</option>
              </select>
              <button
                aria-label={dark ? t('theme.light') : t('theme.dark')}
                onClick={() => setDark(!dark)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white shadow-card"
              >
                {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              </button>
            </div>

            {!isAuthenticated ? (
              <>
                <Link to="/login" className="hidden items-center gap-1 text-neutral-600 hover:text-neutral-900 lg:flex">
                  <UserIcon className="h-4 w-4" />
                  {t('actions.login')}
                </Link>
                <Link to="/register" className="hidden lg:flex">
                  <Button size="sm" variant="accent">
                    {t('actions.signup')}
                  </Button>
                </Link>
              </>
            ) : (
              <button onClick={handleLogout} className="hidden text-neutral-600 transition hover:text-neutral-900 lg:inline-flex">
                {t('actions.logout')}
              </button>
            )}

            <button
              onClick={openCart}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary text-white shadow-glow"
              aria-label="Open cart"
            >
              <ShoppingBagIcon className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-semibold text-neutral-900">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="block px-6 pb-4 lg:hidden">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') handleSubmit()
              }}
              className="h-11 w-full rounded-2xl border border-white/30 bg-white/70 pl-12 pr-4 text-sm text-neutral-700 shadow-inner focus:border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-200"
              placeholder={t('search.placeholder')}
            />
            {suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-12 z-20 rounded-2xl border border-neutral-100 bg-white/90 p-2 shadow-glass backdrop-blur">
                {suggestions.map((item, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => handleSubmit(item)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-neutral-600 transition hover:bg-neutral-100"
                    >
                      <span>{item}</span>
                      <span className="text-xs text-neutral-400">↵</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </motion.header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <CartSidebar />
    </>
  )
}
