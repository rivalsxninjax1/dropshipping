import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useUIStore } from '../store/ui'
import Button from './Button'
import { formatUsdAsNpr } from '../utils/currency'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addToCart } from '../api'
import { useToast } from './Toast'
import { Badge } from './ui/Badge'
import { motion } from 'framer-motion'

export default function ProductQuickView() {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const product = useUIStore(s => s.quickViewProduct)
  const close = useUIStore(s => s.closeQuickView)
  const qc = useQueryClient()
  const [qty, setQty] = useState(1)
  const addMutation = useMutation({
    mutationFn: (variables: { id: number; qty: number }) => addToCart(variables.id, variables.qty),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      toast.notify(t('actions.addToCart'))
      close()
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail
      toast.notify(detail || t('status.error'))
    },
  })

  const displayPrice = product ? formatUsdAsNpr(product.base_price, i18n.language) : ''

  // Reset quantity whenever a new product is opened to avoid persisting previous counts.
  useEffect(() => {
    if (product) {
      setQty(1)
    }
  }, [product?.id])

  return (
    <Transition.Root show={Boolean(product)} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={close}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-6"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-6"
            >
              <Dialog.Panel className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white/90 shadow-glass backdrop-blur-xl dark:bg-neutral-950/90">
                {product && (
                  <div className="grid gap-8 p-8 md:grid-cols-[1.2fr_1fr]">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                      className="relative overflow-hidden rounded-3xl"
                    >
                      <img
                        src={product.images || product.gallery?.[0] || 'https://via.placeholder.com/600x600'}
                        alt={product.title}
                        className="h-full max-h-[420px] w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute left-6 top-6 flex flex-wrap gap-2">
                        <Badge>{product.brand || 'Premium pick'}</Badge>
                        <Badge variant="outline">4.9 ★</Badge>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.05 }}
                      className="flex flex-col gap-5"
                    >
                      <Dialog.Title className="font-heading text-2xl font-semibold text-neutral-900 dark:text-white">
                        {product.title}
                      </Dialog.Title>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        {product.description?.slice(0, 140) || t('product.quickView.summary', 'Curated for everyday style with premium finishes and smart utility details.')}
                      </p>

                      <div className="flex items-center gap-4 rounded-3xl bg-neutral-100/70 p-4 text-neutral-800 shadow-inner dark:bg-neutral-900/70 dark:text-neutral-100">
                        <div>
                          <p className="text-xs uppercase tracking-[0.4em] text-neutral-500">Investment</p>
                          <p className="text-2xl font-bold">{displayPrice}</p>
                        </div>
                        <div className="h-8 w-px bg-neutral-300/60" />
                        <div>
                          <p className="text-xs uppercase tracking-[0.4em] text-neutral-500">Delivery</p>
                          <p className="text-sm font-semibold">3–5 business days</p>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-neutral-200/70 bg-white/70 p-4 text-sm shadow-card dark:border-neutral-800/70 dark:bg-neutral-900/60">
                        <ul className="space-y-2">
                          <li>• Exchanges available according to supplier (peace of mind for gifting)</li>
                          <li>• Secure payment via eSewa and Khalti</li>
                          <li>• Packaged in a secured way </li>
                        </ul>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="inline-flex items-center gap-3 rounded-full border border-neutral-200/70 bg-white/80 px-4 py-2 shadow-inner dark:border-neutral-700 dark:bg-neutral-900/60">
                          <button
                            onClick={() => setQty(q => Math.max(1, q - 1))}
                            className="text-neutral-500 transition hover:text-neutral-900"
                            aria-label="Decrease quantity"
                          >
                            –
                          </button>
                          <span className="text-base font-semibold text-neutral-900 dark:text-white">{qty}</span>
                          <button
                            onClick={() => setQty(q => q + 1)}
                            className="text-neutral-500 transition hover:text-neutral-900"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <Button
                          className="flex-1"
                          onClick={() => product && addMutation.mutate({ id: product.id, qty })}
                          disabled={addMutation.isPending}
                        >
                          {addMutation.isPending ? t('status.loading') : t('actions.addToCart')}
                        </Button>
                      </div>

                      <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        {t('product.quickView.note', 'Get same-day dispatch if you order before 2 PM NST. Need styling tips? Tap the floating chat.')}
                      </p>
                    </motion.div>
                  </div>
                )}

                <button
                  onClick={close}
                  className="absolute right-6 top-6 rounded-full bg-white/70 px-3 py-1 text-sm text-neutral-600 shadow-card transition hover:text-neutral-900"
                  aria-label="Close quick view"
                >
                  Close
                </button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
