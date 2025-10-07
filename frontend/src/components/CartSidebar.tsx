import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getCart, updateCart, removeFromCart } from '../api'
import { useUIStore } from '../store/ui'
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter'
import Button from './Button'
import { TrashIcon, MinusSmallIcon, PlusSmallIcon } from '@heroicons/react/24/outline'

type CartEntry = {
  product: {
    id: number
    sku: string
    title: string
    primary_image?: string
    images?: string
  }
  quantity: number
  unit_price: string
}

type CartResponse = {
  items: CartEntry[]
  total: string
}

export default function CartSidebar() {
  const cartOpen = useUIStore(s => s.cartOpen)
  const close = useUIStore(s => s.closeCart)
  const { data } = useQuery<CartResponse>({ queryKey: ['cart'], queryFn: getCart })
  const items = data?.items ?? []
  const formatPrice = useCurrencyFormatter()
  const qc = useQueryClient()

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

  const subtotal = data?.total
    ? Number(data.total)
    : items.reduce((sum: number, item: CartEntry) => sum + Number(item.unit_price) * item.quantity, 0)

  return (
    <Transition.Root show={cartOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-4">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-hidden rounded-l-3xl bg-white/85 shadow-glass backdrop-blur-xl dark:bg-neutral-950/90">
                    <header className="flex items-center justify-between border-b border-white/60 px-6 py-5 dark:border-neutral-800">
                      <Dialog.Title className="text-lg font-semibold text-neutral-900 dark:text-white">
                        Your bag
                      </Dialog.Title>
                      <button onClick={close} className="text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-300">
                        ✕
                      </button>
                    </header>

                    {items.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                        <span className="text-4xl">🛍️</span>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Your cart is feeling light—start exploring our curated drops.
                        </p>
                        <Button onClick={close}>Discover products</Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 overflow-y-auto px-6 py-6">
                          <ul className="space-y-4">
                            {items.map((item: CartEntry) => (
                              <li key={item.product.id} className="rounded-2xl border border-white/40 bg-white/70 p-4 shadow-card backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60">
                                <div className="flex items-start gap-4">
                                  <img
                                    src={item.product.primary_image || item.product.images || 'https://via.placeholder.com/240x240'}
                                    alt={item.product.title}
                                    className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover"
                                    loading="lazy"
                                  />
                                  <div className="flex flex-1 flex-col gap-2">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">{item.product.title}</p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">SKU • {item.product.sku}</p>
                                      </div>
                                      <button
                                        type="button"
                                        disabled={remove.isPending}
                                        onClick={() => remove.mutate(item.product.id)}
                                        className="rounded-full bg-white/60 p-2 text-neutral-400 transition hover:text-red-500 disabled:opacity-50"
                                        aria-label="Remove item"
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="inline-flex items-center gap-3 rounded-full bg-white/80 px-3 py-1 shadow-inner">
                                        <button
                                          type="button"
                                          disabled={update.isPending || item.quantity <= 1}
                                          onClick={() => update.mutate({ id: item.product.id, qty: Math.max(1, item.quantity - 1) })}
                                          className="text-neutral-500 transition hover:text-neutral-800 disabled:opacity-50"
                                          aria-label="Decrease quantity"
                                        >
                                          <MinusSmallIcon className="h-4 w-4" />
                                        </button>
                                        <span className="text-sm font-semibold text-neutral-700">{item.quantity}</span>
                                        <button
                                          type="button"
                                          disabled={update.isPending}
                                          onClick={() => update.mutate({ id: item.product.id, qty: item.quantity + 1 })}
                                          className="text-neutral-500 transition hover:text-neutral-800 disabled:opacity-50"
                                          aria-label="Increase quantity"
                                        >
                                          <PlusSmallIcon className="h-4 w-4" />
                                        </button>
                                      </div>
                                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                                        {formatPrice(Number(item.unit_price) * item.quantity)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <footer className="space-y-4 border-t border-white/50 bg-white/70 px-6 py-6 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70">
                          <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-300">
                            <span>Subtotal</span>
                            <span className="text-base font-semibold text-neutral-900 dark:text-white">{formatPrice(subtotal)}</span>
                          </div>
                          <p className="rounded-2xl bg-white/60 p-3 text-xs text-neutral-500 shadow-inner dark:bg-neutral-900/60 dark:text-neutral-400">
                            Shipping and taxes calculated at checkout. No hidden fees, only designer-approved fashion delivered to you.
                          </p>
                          <div className="flex flex-col gap-3">
                            <Button onClick={close} variant="outline">
                              Continue shopping
                            </Button>
                            <Link to="/checkout" onClick={close} className="inline-flex">
                              <Button className="w-full">Checkout securely</Button>
                            </Link>
                          </div>
                        </footer>
                      </>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
