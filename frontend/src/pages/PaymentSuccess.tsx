import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter'

function Spinner() {
  return (
    <svg className="h-6 w-6 animate-spin text-neutral-600" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function PaymentSuccess() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const provider = params.get('provider') || ''
  const order_id = params.get('order_id') || ''
  const token = params.get('token') || ''
  const refId = params.get('refId') || ''
  const amt = params.get('amt') || ''
  const pid = params.get('pid') || ''

  const [status, setStatus] = useState<'loading'|'ok'|'error'>('loading')
  const [msg, setMsg] = useState<string>('')
  const [providerPaymentId, setProviderPaymentId] = useState<string>('')
  const [order, setOrder] = useState<any | null>(null)
  const formatPrice = useCurrencyFormatter()

  useEffect(() => {
    const verify = async () => {
      try {
        const { data } = await api.get('/payments/verify/', { params: { provider, order_id, token, refId, amt, pid } })
        setProviderPaymentId(data?.provider_payment_id || token || refId)
        setStatus('ok')
        setMsg('Payment verified successfully.')
        try {
          const orderResp = await api.get(`/orders/${order_id}/`)
          setOrder(orderResp.data)
        } catch {}
      } catch (e: any) {
        setStatus('error')
        setMsg(e?.response?.data?.detail || 'Verification failed')
      }
    }
    verify()
  }, [provider, order_id, token, refId, amt])

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mx-auto max-w-xl rounded-md border bg-white p-6 text-center shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
          {status === 'loading' ? <Spinner /> : '✓'}
        </div>
        <h1 className="text-2xl font-semibold">{status === 'ok' ? 'Payment Successful' : status === 'loading' ? 'Verifying Payment' : 'Payment Error'}</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{msg}</p>

        {status === 'ok' && (
          <div className="mt-6 grid gap-3 text-left">
            <div className="rounded-md border bg-neutral-50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-neutral-600">Order ID</span><div className="font-medium">{order_id}</div></div>
                <div><span className="text-neutral-600">Provider</span><div className="font-medium capitalize">{provider}</div></div>
                <div className="col-span-2"><span className="text-neutral-600">Payment ID</span><div className="font-mono text-sm">{providerPaymentId}</div></div>
              </div>
            </div>

            {order && (
              <div className="rounded-md border bg-white p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                <div className="mb-2 font-medium">Order summary</div>
                <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {(order.items || []).map((it: any) => (
                    <li key={it.id} className="py-2 flex justify-between">
                      <div>{it.product?.title || it.product} <span className="text-xs text-neutral-600">× {it.quantity}</span></div>
                      <div>{formatPrice(Number(it.unit_price) * it.quantity)}</div>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex justify-between border-t pt-2 dark:border-neutral-700"><span>Total</span><span className="font-semibold">{formatPrice(order.total_amount)}</span></div>
              </div>
            )}

            <div className="mt-2 flex justify-center gap-3">
              <Link to="/" className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white">Continue Shopping</Link>
              <Link to="/account/orders" className="rounded border px-4 py-2 text-sm dark:border-neutral-700">View Orders</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
