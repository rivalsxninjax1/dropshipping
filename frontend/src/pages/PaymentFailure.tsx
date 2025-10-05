import { Link, useLocation } from 'react-router-dom'

export default function PaymentFailure() {
  const { search } = useLocation()
  const p = new URLSearchParams(search)
  const provider = (p.get('provider') || '').toUpperCase()
  const orderId = p.get('order_id') || ''
  const reason = p.get('reason') || p.get('message') || 'The transaction was cancelled, failed, or expired.'

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mx-auto max-w-xl rounded-md border bg-white p-6 text-center shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">!</div>
        <h1 className="text-2xl font-semibold">Payment Failed</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{reason}</p>
        <div className="mt-2 text-xs text-neutral-500">{provider ? `Provider: ${provider}` : ''} {orderId ? `· Order #${orderId}` : ''}</div>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="rounded border px-4 py-2 text-sm dark:border-neutral-700">Continue Shopping</Link>
          <Link to="/account/orders" className="rounded border px-4 py-2 text-sm dark:border-neutral-700">View Orders</Link>
          <Link to="/checkout" className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white">Try Again</Link>
        </div>
      </div>
    </div>
  )
}
