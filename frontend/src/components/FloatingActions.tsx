import { useEffect } from 'react'
import { ShoppingBagIcon, ChatBubbleBottomCenterTextIcon, PhoneArrowDownLeftIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import Button from './Button'
import { useUIStore } from '../store/ui'
import { useCartStore } from '../store/cart'
import { useQuery } from '@tanstack/react-query'
import { getCart } from '../api'

const whatsappNumber = import.meta.env.VITE_CHAT_WHATSAPP as string | undefined
const viberNumber = import.meta.env.VITE_CHAT_VIBER as string | undefined

const buildWhatsAppLink = (number: string) => `https://wa.me/${number.replace(/[^0-9]/g, '')}`
const buildViberLink = (number: string) => `viber://chat?number=${encodeURIComponent(number)}`

export default function FloatingActions() {
  const openCart = useUIStore(s => s.openCart)
  const toggleChat = useUIStore(s => s.toggleChat)
  const chatOpen = useUIStore(s => s.chatOpen)
  const { data } = useQuery({ queryKey: ['cart'], queryFn: getCart })
  const hydrateItems = useCartStore(s => s.items)
  const badge = (data?.items || hydrateItems).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)

  useEffect(() => {
    document.body.classList.toggle('chat-open', chatOpen)
  }, [chatOpen])

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="chat-card"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="w-72 rounded-3xl bg-white p-4 shadow-glass ring-1 ring-neutral-100 dark:bg-neutral-900 dark:ring-neutral-800"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">💬</div>
              <div className="text-sm text-neutral-600">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Need sizing or delivery help?</p>
                <p className="text-xs text-neutral-500">Chat directly on WhatsApp or Viber.</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {whatsappNumber && (
                <Button
                  as="a"
                  size="sm"
                  href={buildWhatsAppLink(whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <ChatBubbleBottomCenterTextIcon className="h-4 w-4" /> WhatsApp
                </Button>
              )}
              {viberNumber && (
                <Button
                  as="a"
                  variant="outline"
                  size="sm"
                  href={buildViberLink(viberNumber)}
                  className="flex items-center justify-center gap-2 border-violet-400 text-violet-500 hover:bg-violet-50"
                >
                  <PhoneArrowDownLeftIcon className="h-4 w-4" /> Viber
                </Button>
              )}
              {!whatsappNumber && !viberNumber && (
                <p className="text-xs text-neutral-500">Set `VITE_CHAT_WHATSAPP` or `VITE_CHAT_VIBER` to enable chat shortcuts.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={openCart}
        aria-label="Open cart"
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-white shadow-glow"
      >
        <ShoppingBagIcon className="h-6 w-6" />
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-semibold text-neutral-900">
            {badge}
          </span>
        )}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={toggleChat}
        aria-label="Toggle chat"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-neutral-900 shadow-glass ring-1 ring-white/70"
      >
        <ChatBubbleBottomCenterTextIcon className="h-6 w-6" />
      </motion.button>
    </div>
  )
}
