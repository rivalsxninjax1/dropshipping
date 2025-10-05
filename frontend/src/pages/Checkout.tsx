import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { checkout, fetchAddresses, getCart, login as apiLogin, register as apiRegister } from '../api'
import AddressForm from '../components/inputs/AddressForm'
import Button from '../components/Button'
import { track } from '../analytics'
import { Link, useSearchParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { useTranslation } from 'react-i18next'
import { useAuthStore, type AuthUser } from '../store/auth'
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter'

function Spinner({ className = 'h-5 w-5 text-white' }) {
  return (
    <svg className={"animate-spin "+className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function Checkout() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const setTokens = useAuthStore(s => s.setTokens)
  const isAuthenticated = !!useAuthStore(s => s.accessToken)
  const [stepIndex, setStepIndex] = useState<number>(isAuthenticated ? 1 : 0)
  const [shipping, setShipping] = useState<any | null>(null)
  const [billing, setBilling] = useState<any | null>(null)
  const [provider, setProvider] = useState<'stripe' | 'paypal' | 'esewa' | 'khalti'>('stripe')
  const [useExisting, setUseExisting] = useState<boolean>(true)
  const [useSame, setUseSame] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'guest'>(searchParams.get('guest') === '1' ? 'guest' : 'login')
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' })

  const stepLabels = t('checkout.steps', { returnObjects: true }) as string[]
  const steps = stepLabels.map((name, index) => ({ key: index, name }))

  useEffect(() => {
    setStepIndex(prev => (isAuthenticated ? Math.max(prev, 1) : 0))
    if (!isAuthenticated) {
      setUseExisting(false)
      setShipping(null)
      setBilling(null)
    }
  }, [isAuthenticated])

  const { data: addresses, isLoading: loadingAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
    retry: 0,
    enabled: isAuthenticated,
  })
  const { data: cart, isLoading: loadingCart } = useQuery({ queryKey: ['cart'], queryFn: getCart })

  const items = cart?.items ?? []
  const subtotal = useMemo(() => items.reduce((sum: number, it: any) => sum + Number(it.unit_price) * it.quantity, 0), [items])
  const shippingCost = items.length ? 5 : 0
  const tax = Math.round(subtotal * 0.1 * 100) / 100 // 10% demo tax
  const total = subtotal + shippingCost + tax
  const formatPrice = useCurrencyFormatter()

  useEffect(() => {
    if (isAuthenticated && addresses && addresses.length && useExisting) {
      setShipping(addresses[0])
      setBilling(useSame ? addresses[0] : addresses[0])
    }
  }, [addresses, useExisting, useSame, isAuthenticated])

  function validateAddresses(): boolean {
    setError(null)
    const errors = t('checkout.errors', { returnObjects: true }) as Record<string, string>
    if (!shipping) { const msg = errors.shippingRequired; setError(msg); toast.notify(msg); return false }
    const s = useExisting ? shipping : shipping || {}
    const required = ['address_line1','city','state','postal_code','country']
    for (const k of required) {
      if (!s[k] || String(s[k]).trim() === '') { const msg = errors.addressRequired; setError(msg); toast.notify(msg); return false }
    }
    if (!useSame) {
      if (!billing) { const msg = errors.billingRequired; setError(msg); toast.notify(msg); return false }
      const b = useExisting ? billing : billing || {}
      for (const k of required) {
        if (!b[k] || String(b[k]).trim() === '') { const msg = errors.addressRequired; setError(msg); toast.notify(msg); return false }
      }
    }
    return true
  }

  const create = useMutation({
    mutationFn: () => checkout({
      shipping_address: useExisting ? shipping?.id ?? shipping : shipping,
      billing_address: useSame ? (useExisting ? (billing?.id ?? shipping) : (billing ?? shipping)) : (useExisting ? (billing?.id ?? billing) : billing),
      provider
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      toast.notify(t('checkout.review.placeOrder'))
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.response?.data?.message
      toast.notify(detail || t('status.error'))
    }
  })

  useEffect(() => {
    if (create.isSuccess) {
      const intent = create.data?.payment_intent
      const form = intent?.payment_form
      if (form?.url && form.fields) {
        const formEl = document.createElement('form')
        formEl.method = (form.method || 'POST').toUpperCase()
        formEl.action = form.url
        formEl.style.display = 'none'
        Object.entries(form.fields).forEach(([name, value]) => {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = name
          input.value = String(value ?? '')
          formEl.appendChild(input)
        })
        document.body.appendChild(formEl)
        formEl.submit()
        document.body.removeChild(formEl)
        return
      }

      // fallback: auto-redirect to provider payment page if URL provided
      const url = intent?.payment_url
      if (url) {
        window.location.href = url
      }
    }
  }, [create.isSuccess, create.data])

  const proceedFromAddress = () => {
    if (!validateAddresses()) return
    setError(null)
    setStepIndex(2)
  }

  if (loadingCart || loadingAddresses) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="flex items-center gap-3 text-neutral-600"><Spinner className="h-6 w-6 text-neutral-600" /> {t('status.loading')}…</div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          {t('cart.empty')}
        </div>
        <div className="mt-4"><Link to="/" className="text-primary-600 hover:underline">{t('actions.continueShopping')}</Link></div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">{t('cart.checkout')}</h1>

      {/* Progress steps */}
      <ol className="mb-6 flex items-center gap-4" aria-label="Progress">
        {steps.map((s, index) => {
          const active = stepIndex === index
          const done = stepIndex > index
          return (
            <li key={s.key} className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${done ? 'bg-green-600 text-white' : active ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                {done ? '✓' : index + 1}
              </span>
              <span className={`text-sm ${active ? 'font-medium' : 'text-neutral-600'}`}>{s.name}</span>
              {index < steps.length - 1 && <span className="mx-2 h-px w-10 bg-neutral-300" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left: forms */}
        <div className="md:col-span-2 space-y-6">
          {error && (
            <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          {!isAuthenticated && stepIndex === 0 && (
            <AccountStep
              mode={authMode}
              setMode={setAuthMode}
              values={authForm}
              onChange={setAuthForm}
              onSuccess={() => {
                setStepIndex(1)
                toast.notify(t('actions.continue'))
              }}
              setTokens={setTokens}
            />
          )}

          {stepIndex === 1 && (
            <div className="space-y-4 rounded-md border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm"><input type="radio" checked={useExisting} onChange={() => setUseExisting(true)} disabled={!isAuthenticated || !addresses?.length} /> {t('checkout.address.useSaved')}</label>
                <label className="inline-flex items-center gap-2 text-sm"><input type="radio" checked={!useExisting} onChange={() => setUseExisting(false)} /> {t('checkout.address.newAddress')}</label>
              </div>

              {useExisting && addresses?.length ? (
                <div className="grid gap-2">
                  <label className="text-sm">{t('checkout.address.shipping')}</label>
                  <select className="rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" value={shipping?.id ?? ''} onChange={e => setShipping(addresses.find((a: any) => a.id === Number(e.target.value)))}>
                    {addresses.map((a: any) => (<option key={a.id} value={a.id}>{a.label || `${a.address_line1}, ${a.city}`}</option>))}
                  </select>
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={useSame} onChange={e => setUseSame(e.target.checked)} /> {t('checkout.address.useSame')}</label>
                  {!useSame && (
                    <>
                      <label className="text-sm">{t('checkout.address.billing')}</label>
                      <select className="rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" value={billing?.id ?? ''} onChange={e => setBilling(addresses.find((a: any) => a.id === Number(e.target.value)))}>
                        {addresses.map((a: any) => (<option key={a.id} value={a.id}>{a.label || `${a.address_line1}, ${a.city}`}</option>))}
                      </select>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  <div>
                    <div className="mb-2 text-sm font-medium">{t('checkout.address.shipping')}</div>
                    <AddressForm value={shipping} onChange={setShipping} />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={useSame} onChange={e => setUseSame(e.target.checked)} /> {t('checkout.address.useSame')}</label>
                  {!useSame && (
                    <div>
                      <div className="mb-2 text-sm font-medium">{t('checkout.address.billing')}</div>
                      <AddressForm value={billing} onChange={setBilling} />
                    </div>
                  )}
                </div>
              )}
              <div className="text-right">
                <Button onClick={proceedFromAddress}>{t('actions.continue')}</Button>
              </div>
            </div>
          )}

          {stepIndex === 2 && (
            <div className="rounded-md border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <div className="flex items-center justify-between">
                <div className="font-medium">{t('checkout.shipping.standard')}</div>
                <div className="font-medium">{formatPrice(shippingCost)}</div>
              </div>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                {t('product.shippingEta')}: {shippingCost > 0 ? formatPrice(shippingCost) : t('checkout.shipping.free')}
              </p>
              <div className="mt-4 flex justify-between text-sm text-neutral-500 dark:text-neutral-300">
                <button onClick={() => setStepIndex(stepIndex - 1)} className="hover:underline">{t('actions.back')}</button>
                <Button onClick={() => setStepIndex(3)}>{t('actions.continue')}</Button>
              </div>
            </div>
          )}

          {stepIndex === 3 && (
            <div className="rounded-md border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <div className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">{t('checkout.payment.title')}</div>
              <div className="grid gap-3 md:grid-cols-2">
                <PaymentOption label={t('checkout.payment.stripe')} active={provider === 'stripe'} onSelect={() => setProvider('stripe')} icon={<StripeIcon />} />
                <PaymentOption label={t('checkout.payment.paypal')} active={provider === 'paypal'} onSelect={() => setProvider('paypal')} icon={<PayPalIcon />} />
                <PaymentOption label={t('checkout.payment.esewa')} active={provider === 'esewa'} onSelect={() => setProvider('esewa')} icon={<ESewaIcon />} />
                <PaymentOption label={t('checkout.payment.khalti')} active={provider === 'khalti'} onSelect={() => setProvider('khalti')} icon={<KhaltiIcon />} />
              </div>
              <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">{t('checkout.payment.info')}</p>
              <div className="mt-4 flex justify-between text-sm text-neutral-500 dark:text-neutral-300">
                <button onClick={() => setStepIndex(stepIndex - 1)} className="hover:underline">{t('actions.back')}</button>
                <Button onClick={() => setStepIndex(4)}>{t('actions.continue')}</Button>
              </div>
            </div>
          )}

          {stepIndex === 4 && (
            <div className="space-y-3 rounded-md border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{t('checkout.review.title')}</p>
              <div className="text-right">
                <Button onClick={() => { if (!validateAddresses()) return; setError(null); track('begin_checkout'); create.mutate() }} disabled={create.isPending}>
                  {create.isPending ? (<span className="inline-flex items-center gap-2"><Spinner /> {t('checkout.review.processing')}</span>) : t('checkout.review.placeOrder')}
                </Button>
              </div>
              {create.isError && (
                <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200">
                  {t('status.error')}
                </div>
              )}
              {create.isSuccess && !create.data?.payment_intent?.payment_url && (
                <div className="text-sm">{t('cart.checkout')}</div>
              )}
            </div>
          )}
        </div>

        {/* Right: order summary */}
        <aside className="md:col-span-1">
          <div className="sticky top-4 rounded-md border bg-white p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mb-3 text-base font-medium">{t('cart.title')}</div>
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {items.map((it: any, idx: number) => (
                <li key={idx} className="py-3">
                  <div className="flex justify-between">
                    <div className="max-w-[60%]">
                      <div className="truncate font-medium">{it.product.title}</div>
                      <div className="text-xs text-neutral-600">Qty {it.quantity}</div>
                    </div>
                    <div className="text-right">{formatPrice(Number(it.unit_price) * it.quantity)}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between"><span>{t('cart.subtotal')}</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span>{t('cart.shipping')}</span><span>{formatPrice(shippingCost)}</span></div>
              <div className="flex justify-between"><span>{t('cart.tax')}</span><span>{formatPrice(tax)}</span></div>
              <div className="flex justify-between border-t pt-2 font-semibold dark:border-neutral-700"><span>{t('cart.total')}</span><span>{formatPrice(total)}</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

type AccountStepProps = {
  mode: 'login' | 'guest'
  setMode: (mode: 'login' | 'guest') => void
  values: { email: string; password: string; name: string }
  onChange: (values: { email: string; password: string; name: string }) => void
  onSuccess: () => void
  setTokens: (access: string, refresh: string, user?: AuthUser | null) => void
}

function AccountStep({ mode, setMode, values, onChange, onSuccess, setTokens }: AccountStepProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const loginMutation = useMutation({
    mutationFn: () => apiLogin(values.email, values.password),
    onSuccess: async (res) => {
      setTokens(res.access, res.refresh, res.user)
      toast.notify(t('actions.login'))
      await qc.invalidateQueries()
      onSuccess()
    },
    onError: () => toast.notify(t('status.error')),
  })

  const registerMutation = useMutation({
    mutationFn: async () => {
      await apiRegister({ email: values.email, password: values.password, first_name: values.name.split(' ')[0] || 'Guest', last_name: values.name.split(' ').slice(1).join(' ') })
      const res = await apiLogin(values.email, values.password)
      return res
    },
    onSuccess: async (res) => {
      setTokens(res.access, res.refresh, res.user)
      toast.notify(t('checkout.guest.createAccount'))
      await qc.invalidateQueries()
      onSuccess()
    },
    onError: () => toast.notify(t('status.error')),
  })

  const isLoading = loginMutation.isPending || registerMutation.isPending

  return (
    <div className="space-y-4 rounded-md border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex gap-3 text-sm">
        <button className={`rounded-full px-3 py-1 ${mode === 'login' ? 'bg-primary-600 text-white' : 'border border-neutral-300 dark:border-neutral-700'}`} onClick={() => setMode('login')}>
          {t('actions.login')}
        </button>
        <button className={`rounded-full px-3 py-1 ${mode === 'guest' ? 'bg-primary-600 text-white' : 'border border-neutral-300 dark:border-neutral-700'}`} onClick={() => setMode('guest')}>
          {t('checkout.guest.title')}
        </button>
      </div>

      <div className="grid gap-3 text-sm">
        {mode === 'guest' && (
          <div>
            <label className="mb-1 block font-medium">{t('checkout.guest.name')}</label>
            <input
              type="text"
              value={values.name}
              onChange={e => onChange({ ...values, name: e.target.value })}
              placeholder="John Doe"
              className="w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block font-medium">{t('checkout.guest.email')}</label>
          <input
            type="email"
            value={values.email}
            onChange={e => onChange({ ...values, email: e.target.value })}
            placeholder="you@example.com"
            className="w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="mb-1 block font-medium">{t('checkout.guest.password')}</label>
          <input
            type="password"
            value={values.password}
            onChange={e => onChange({ ...values, password: e.target.value })}
            placeholder="••••••••"
            className="w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-neutral-500 dark:text-neutral-300">{mode === 'guest' ? t('checkout.guest.subtitle') : t('checkout.guest.signInInstead')}</span>
        <Button
          onClick={() => (mode === 'guest' ? registerMutation.mutate() : loginMutation.mutate())}
          disabled={isLoading || !values.email || !values.password}
        >
          {isLoading ? <Spinner /> : mode === 'guest' ? t('checkout.guest.createAccount') : t('actions.login')}
        </Button>
      </div>
    </div>
  )
}

function PaymentOption({ label, active, onSelect, icon }: { label: string; active: boolean; onSelect: () => void; icon: JSX.Element }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition ${active ? 'border-primary-600 ring-2 ring-primary-200' : 'border-neutral-300 hover:border-primary-400 dark:border-neutral-700'}`}
      onClick={onSelect}
    >
      <input type="radio" className="sr-only" checked={active} readOnly />
      {icon}
      <span className="font-medium">{label}</span>
    </label>
  )
}

const StripeIcon = () => <span className="text-lg font-semibold text-[#635bff]">S</span>
const PayPalIcon = () => <span className="text-lg font-semibold text-[#253b80]">PP</span>
const ESewaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="h-6 w-6">
    <circle cx="32" cy="32" r="30" fill="#1ba548" />
    <text x="32" y="39" textAnchor="middle" fontSize="28" fontWeight="700" fill="#fff">e</text>
  </svg>
)
const KhaltiIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="h-6 w-6">
    <rect x="6" y="6" width="52" height="52" rx="8" fill="#5b2d91" />
    <text x="32" y="40" textAnchor="middle" fontSize="22" fontWeight="700" fill="#fff">K</text>
  </svg>
)
