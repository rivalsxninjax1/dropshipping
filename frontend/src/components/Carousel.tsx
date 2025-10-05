import { motion } from 'framer-motion'
import type { Product } from '../types/api'
import ProductCard from './ProductCard'

export default function Carousel({ items }: { items: Product[] }) {
  if (!items?.length) return (
    <div className="h-48 animate-pulse rounded-3xl bg-neutral-100" />
  )

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent" aria-hidden="true" />
      <motion.ul
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-2 py-2"
        drag="x"
        dragConstraints={{ left: -200, right: 0 }}
        dragTransition={{ power: 0.2, timeConstant: 200 }}
      >
        {items.map(product => (
          <li key={product.id} className="snap-start w-[280px] shrink-0">
            <ProductCard product={product} />
          </li>
        ))}
      </motion.ul>
    </div>
  )
}
