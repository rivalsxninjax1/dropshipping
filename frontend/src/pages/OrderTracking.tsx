import { useState } from 'react'
import { trackOrder } from '../api'
import { useMutation } from '@tanstack/react-query'
import Seo from '../components/Seo'
import { useTranslation } from 'react-i18next'

export default function OrderTracking() {
  const { t } = useTranslation()
  const [orderId, setOrderId] = useState('')
  const [email, setEmail] = useState('')

  const tracking = useMutation({
    mutationFn: () => trackOrder({ order_id: orderId, email }),
  })

  const order = tracking.data

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <Seo title={t('tracking.title', { defaultValue: 'Track your order' })} description={t('tracking.description', { defaultValue: 'Get real-time updates on your Dropshipper order status.' })} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">{t('tracking.heading', { defaultValue: 'Where is my order?' })}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">{t('tracking.subheading', { defaultValue: 'Enter your order number and email address to check status and tracking updates.' })}</p>
      </header>

      <form
        className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        onSubmit={event => {
          event.preventDefault()
          tracking.mutate()
        }}
      >
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200" htmlFor="order_id">{t('tracking.orderId')}</label>
        <input
          id="order_id"
          value={orderId}
          onChange={event => setOrderId(event.target.value)}
          required
          placeholder="#1234"
          className="w-full rounded border border-neutral-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
        />
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200" htmlFor="email">{t('tracking.email')}</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          required
          placeholder="you@example.com"
          className="w-full rounded border border-neutral-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-full bg-gradient-primary px-6 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
            disabled={tracking.isPending}
          >
            {tracking.isPending ? t('status.loading') : t('tracking.submit', { defaultValue: 'Check status' })}
          </button>
        </div>
      </form>

      {tracking.isSuccess && order && (
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{t('tracking.orderNumber', { defaultValue: 'Order #{{id}}', id: order.id })}</h2>
            <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">{order.status}</span>
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            {t('tracking.paymentStatus', { defaultValue: 'Payment status: {{status}}', status: order.payment_status })}
          </div>
          {order.events && order.events.length > 0 ? (
            <ol className="mt-4 space-y-3 border-l border-neutral-200 pl-4 text-sm dark:border-neutral-700">
              {order.events.map(event => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[9px] top-1 block h-3 w-3 rounded-full bg-primary-500" />
                  <div className="font-medium text-neutral-800 dark:text-neutral-100">{event.status}</div>
                  <div className="text-xs text-neutral-500">{new Date(event.created_at).toLocaleString()}</div>
                  {event.note && <div className="text-xs text-neutral-500">{event.note}</div>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-neutral-500">{t('tracking.noUpdates', { defaultValue: 'Your order is getting ready. We will notify you once it ships.' })}</p>
          )}
        </section>
      )}

      {tracking.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {t('tracking.notFound', { defaultValue: 'We could not find an order with those details. Double-check your entry or contact support.' })}
        </div>
      )}
    </div>
  )
}
