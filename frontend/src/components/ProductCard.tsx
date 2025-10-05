import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Product } from '../types/api'
import { formatUsdAsNpr } from '../utils/currency'
import { Badge } from './ui/Badge'
import Button from './Button'
import { useUIStore } from '../store/ui'
import { motion } from 'framer-motion'

const shimmer = 'data:image/svg+xml;base64,' +
  btoa(
    `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop stop-color="#f8fafc" offset="20%"/><stop stop-color="#e2e8f0" offset="50%"/><stop stop-color="#f8fafc" offset="80%"/></linearGradient></defs><rect width="400" height="300" fill="#f8fafc"/><rect width="400" height="300" fill="url(#g)"/></svg>`
  )

export default function ProductCard({ product }: { product: Product }) {
  const { i18n } = useTranslation()
  const openQuickView = useUIStore(s => s.openQuickView)
  const displayPrice = formatUsdAsNpr(product.base_price, i18n.language)
  const image = product.images || product.gallery?.[0] || shimmer
  const rating = product.avg_rating ?? 4.8
  const limited = Number((product.attributes as any)?.stock ?? 12) <= 12

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group relative h-full overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-3 shadow-card backdrop-blur-sm transition hover:border-primary-100 hover:shadow-glow"
    >
      <Link to={`/p/${product.slug}`} className="absolute inset-0" aria-label={product.title} />

      <div className="relative overflow-hidden rounded-2xl">
        <img
          src={image}
          alt={product.title}
          loading="lazy"
          className="aspect-[4/5] w-full rounded-2xl object-cover transition duration-500 ease-out group-hover:scale-[1.05]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-900/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute left-4 right-4 top-4 flex items-start justify-between">
          <Badge>{product.brand || 'Trending pick'}</Badge>
          {limited && <Badge variant="warning">Low stock</Badge>}
        </div>

        <div className="absolute inset-x-4 bottom-4 flex translate-y-4 flex-col gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Button
            onClick={event => {
              event.preventDefault()
              openQuickView(product)
            }}
            className="w-full"
          >
            Quick view
          </Button>
          <Button
            variant="secondary"
            className="w-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
            onClick={event => {
              event.preventDefault()
              openQuickView(product)
            }}
          >
            Add to cart
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>SKU • {product.sku}</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            {rating.toFixed(1)} ★
          </span>
        </div>
        <h3 className="text-base font-semibold text-neutral-900 line-clamp-2">
          {product.title}
        </h3>
        <div className="flex items-end justify-between">
          <p className="text-lg font-bold text-neutral-900">{displayPrice}</p>
          <p className="text-xs text-neutral-400">Ships in 3-5 days</p>
        </div>
      </div>
    </motion.article>
  )
}
