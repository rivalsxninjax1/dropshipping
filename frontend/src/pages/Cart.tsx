import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCart, updateCart, removeFromCart } from '../api'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../components/Button'
import { useAuthStore } from '../store/auth'
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter'

type CartEntry = {
  product: {
    id: number
    sku: string
    title: string
  }
  quantity: number
  unit_price: string
}

type CartResponse = {
  items: CartEntry[]
  total: string
}

export default function Cart() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = !!useAuthStore(s => s.accessToken)
  const { data } = useQuery<CartResponse>({ queryKey: ['cart'], queryFn: getCart })
  const items = data?.items ?? []
  const saved = useQuery({ queryKey: ['saved'], queryFn: fetchSavedForLater })

  const update = useMutation({
    mutationFn: ({ id, qty }: { id: number; qty: number }) => updateCart(id, qty),
    onMutate: async ({ id, qty }) => {
      await qc.cancelQueries({ queryKey: ['cart'] })
      const previous = qc.getQueryData<CartResponse>(['cart'])
      if (previous) {
        const nextItems = previous.items
          .map(entry => (entry.product.id === id ? { ...entry, quantity: qty } : entry))
          .filter(entry => entry.quantity > 0)
        const total = nextItems.reduce((sum, entry) => sum + Number(entry.unit_price) * entry.quantity, 0)
        qc.setQueryData<CartResponse>(['cart'], {
          items: nextItems,
          total: total.toFixed(2),
        })
      }
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['cart'], ctx.previous)
    },
    onSuccess: (next) => {
      qc.setQueryData(['cart'], next)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => removeFromCart(id),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['cart'] })
      const previous = qc.getQueryData<CartResponse>(['cart'])
      if (previous) {
        const nextItems = previous.items.filter(entry => entry.product.id !== id)
        const total = nextItems.reduce((sum, entry) => sum + Number(entry.unit_price) * entry.quantity, 0)
        qc.setQueryData<CartResponse>(['cart'], {
          items: nextItems,
          total: total.toFixed(2),
        })
      }
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['cart'], ctx.previous)
    },
    onSuccess: (next) => {
      qc.setQueryData(['cart'], next)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  const saveMutation = useMutation({
    mutationFn: (productId: number) => saveForLater(productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      qc.invalidateQueries({ queryKey: ['saved'] })
    },
  })

  const removeSavedMutation = useMutation({
    mutationFn: (productId: number) => removeFromSaved(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved'] }),
  })

  const moveSavedToCart = useMutation({
    mutationFn: async ({ id, qty }: { id: number; qty: number }) => {
      await addToCart(id, qty)
      await removeFromSaved(id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      qc.invalidateQueries({ queryKey: ['saved'] })
    },
  })

  const apiTotal = data?.total ? Number(data.total) : null
  const subtotal = apiTotal ?? items.reduce((sum: number, it: CartEntry) => sum + Number(it.unit_price) * it.quantity, 0)
  const shipping = items.length ? 5 : 0
  const tax = subtotal * 0.1
  const grandTotal = subtotal + shipping + tax
  const formatPrice = useCurrencyFormatter()

  const handleGuestCheckout = () => {
    navigate({ pathname: '/checkout', search: '?guest=1' }, { state: { from: location.pathname } })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('cart.title')}</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
        </div>
        <div className="text-right text-sm text-neutral-600 dark:text-neutral-300">
          {t('cart.total')}: <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatPrice(grandTotal)}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
          {t('cart.empty')}
          <div className="mt-4">
            <Link to="/products" className="inline-flex text-primary-600 hover:underline">{t('actions.continueShopping')}</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <ul className="space-y-3">
              {items.map((it: CartEntry) => (
                <li key={it.product.id} className="flex flex-col justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:flex-row sm:items-center">
                  <div>
                    <div className="font-medium">{it.product.title}</div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-300">{formatPrice(it.unit_price)}</div>
                    <div className="text-xs text-neutral-400">{t('product.sku')}: {it.product.sku}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="sr-only" htmlFor={`qty_${it.product.id}`}>Quantity</label>
                    <input
                      id={`qty_${it.product.id}`}
                      aria-label="Quantity"
                      type="number"
                      min={1}
                      className="w-20 rounded border px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                      value={it.quantity}
                      onChange={e => {
                        const nextQty = Math.max(1, Number(e.target.value) || 1)
                        update.mutate({ id: it.product.id, qty: nextQty })
                      }}
                    />
                    <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-3">
                      <button
                        type="button"
                        disabled={saveMutation.isPending}
                        className="text-sm text-neutral-500 hover:underline disabled:opacity-50"
                        onClick={() => saveMutation.mutate(it.product.id)}
                      >
                        {t('actions.saveForLater', { defaultValue: 'Save for later' })}
                      </button>
                      <button
                        type="button"
                        disabled={remove.isPending}
                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                        onClick={() => remove.mutate(it.product.id)}
                      >
                        {t('actions.delete')}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {saved.data && saved.data.length > 0 && (
            <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              <h2 className="text-base font-semibold">{t('cart.savedForLater', { defaultValue: 'Saved for later' })}</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {saved.data.map(item => (
                  <li key={item.product.id} className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-neutral-800 dark:text-neutral-100">{item.product.title}</div>
                      <div className="text-xs text-neutral-500">{formatPrice(item.product.base_price)} · {t('product.sku')}: {item.product.sku}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => moveSavedToCart.mutate({ id: item.product.id, qty: item.quantity ?? 1 })}
                        disabled={moveSavedToCart.isPending}
                      >
                        {t('actions.addToCart')}
                      </Button>
                      <button
                        type="button"
                        className="text-xs text-neutral-500 hover:underline disabled:opacity-50"
                        disabled={removeSavedMutation.isPending}
                        onClick={() => removeSavedMutation.mutate(item.product.id)}
                      >
                        {t('actions.remove', { defaultValue: 'Remove' })}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <aside>
            <div className="sticky top-24 space-y-4">
              <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                <h2 className="text-base font-semibold">{t('cart.total')}</h2>
                <dl className="mt-3 space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
                  <div className="flex justify-between"><dt>{t('cart.subtotal')}</dt><dd>{formatPrice(subtotal)}</dd></div>
                  <div className="flex justify-between"><dt>{t('cart.shipping')}</dt><dd>{formatPrice(shipping)}</dd></div>
                  <div className="flex justify-between"><dt>{t('cart.tax')}</dt><dd>{formatPrice(tax)}</dd></div>
                  <div className="flex justify-between border-t pt-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    <dt>{t('cart.total')}</dt>
                    <dd>{formatPrice(grandTotal)}</dd>
                  </div>
                </dl>
                <div className="mt-4 grid gap-2">
                  <Button onClick={() => navigate('/checkout')}>{t('cart.checkout')}</Button>
                  {!isAuthenticated && (
                    <Button variant="outline" onClick={handleGuestCheckout}>{t('cart.guest.continueAsGuest')}</Button>
                  )}
                </div>
              </div>

              {!isAuthenticated && (
                <div className="rounded-xl border bg-white p-4 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                  <h3 className="font-semibold">{t('cart.guest.title')}</h3>
                  <p className="mt-1 text-neutral-600 dark:text-neutral-300">{t('cart.guest.description')}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <Link to="/login" className="text-primary-600 hover:underline">{t('cart.guest.signIn')}</Link>
                    <Link to="/register" className="text-primary-600 hover:underline">{t('actions.signup')}</Link>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
