import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from './Button'
import { Badge } from './ui/Badge'

const photos = [
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
]

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-primary text-white">
      <div className="absolute inset-0">
        <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 animate-float rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-16 h-96 w-96 animate-pulse-soft rounded-full bg-emerald-200/30 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-24 lg:flex-row lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl text-center lg:text-left"
        >
          <Badge className="bg-white/20 text-white">NEW COLLECTIONS WITH NEW ELEGENCE</Badge>
          <h1 className="mt-6 font-heading text-4xl font-semibold leading-tight sm:text-5xl">
            Step into elegance with designer-approved outfits crafted for Nepali lifestyles.
          </h1>
          <p className="mt-4 text-base text-white/80 sm:text-lg">
        From timeless traditional clothing to bold modern ethnic wear, every piece at VastraStore is handpicked by our fashion experts.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
            <Link to="/products" className="inline-flex">
              <Button size="lg">Shop Designer Picks</Button>
            </Link>
            <Link to="/about" className="inline-flex">
              <Button variant="outline" size="lg" className="border-white/50 bg-white/10 text-white hover:border-white hover:bg-white/20">
                Our story
              </Button>
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-white/70 lg:justify-start">
            <div>
              <span className="text-2xl font-bold text-white">🇳🇵</span>
              <span className="ml-2 text-xs uppercase tracking-[0.3em]">Trustable Across Whole Nepal</span>
            </div>
            <div className="h-8 w-px bg-white/30" aria-hidden="true" />
            <div>
              <span className="text-2xl font-bold text-white">4.9/5</span>
              <span className="ml-2 text-xs uppercase tracking-[0.3em]">Average rating</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative flex flex-1 justify-center"
        >
          <div className="relative grid w-full max-w-xl grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <motion.img
                key={photo}
                src={photo}
                alt="Curated product"
                loading="lazy"
                className="h-48 w-full rounded-3xl object-cover shadow-glow"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 + index * 0.08 }}
              />
            ))}
          </div>
          <div className="absolute -bottom-10 right-6 hidden rounded-3xl bg-white/90 p-4 text-left text-neutral-900 shadow-glass backdrop-blur lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">As seen in</p>
            <p className="mt-2 text-sm font-semibold">Kathmandu · Pokhara · Biratnagar</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
