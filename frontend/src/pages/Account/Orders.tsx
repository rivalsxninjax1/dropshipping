import { useQuery } from '@tanstack/react-query'
import { listOrders } from '../../api'
import AccountLayout from '../../components/AccountLayout'
import { useTranslation } from 'react-i18next'

export default function Orders() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({ queryKey: ['orders'], queryFn: listOrders })
  const items = data?.results ?? []

  return (
    <AccountLayout title={t('account.orders.title')} description={t('account.orders.timeline')}>
      {isLoading ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">{t('status.loading')}…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-6 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">{t('status.empty')}</div>
      ) : (
        <ul className="space-y-4">
          {items.map(order => (
            <li key={order.id} className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-base font-semibold">#{order.id}</div>
                <div className="text-sm text-neutral-500">
                  {t('account.orders.status')}: <span className="font-medium text-neutral-900 dark:text-neutral-100">{order.status}</span>
                </div>
                <div className="text-sm text-neutral-500">
                  {t('account.orders.paymentStatus')}: <span className="font-medium text-neutral-900 dark:text-neutral-100">{order.payment_status}</span>
                </div>
              </div>
              <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                {t('account.orders.placed')}: {new Date(order.placed_at).toLocaleString()}
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-medium uppercase tracking-wide text-neutral-500">{t('account.orders.items')}</h4>
                <ul className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
                  {order.items.map(item => (
                    <li key={item.id}>{item.product.title} × {item.quantity}</li>
                  ))}
                </ul>
              </div>
              {order.events && order.events.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium uppercase tracking-wide text-neutral-500">{t('account.orders.timeline')}</h4>
                  <ol className="mt-2 space-y-2 border-l border-neutral-200 pl-4 text-sm dark:border-neutral-700">
                    {order.events.map(event => (
                      <li key={event.id} className="relative">
                        <span className="absolute -left-[9px] top-1 block h-3 w-3 rounded-full bg-primary-500" />
                        <div className="font-medium text-neutral-800 dark:text-neutral-200">{event.status}</div>
                        <div className="text-xs text-neutral-500">{new Date(event.created_at).toLocaleString()}</div>
                        {event.note && <div className="text-xs text-neutral-500">{event.note}</div>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AccountLayout>
  )
}
