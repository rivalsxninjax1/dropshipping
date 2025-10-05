import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchProducts, fetchCategories } from '../api'
import Hero from '../components/Hero'
import ProductCard from '../components/ProductCard'
import Carousel from '../components/Carousel'
import { SectionTitle } from '../components/ui/SectionTitle'
import { GlassCard } from '../components/ui/GlassCard'
import Button from '../components/Button'
import { motion } from 'framer-motion'

const benefits = [
  {
    title: 'Free express shipping',
    description: 'Complimentary same-day dispatch on orders above NPR 5,000.',
    icon: '🚚',
  },
  {
    title: 'Curated by stylists',
    description: 'Each drop is reviewed by our trend scouts to stay ahead of the hype.',
    icon: '✨',
  },
  {
    title: 'Secure checkout',
    description: 'Trusted partners: eSewa, Khalti, Stripe, and PayPal protected.',
    icon: '🔒',
  },
]

const testimonials = [
  {
    quote: 'Every drop feels like it was designed for my feed. The packaging and experience scream premium.',
    author: 'Sanjana K., Kathmandu',
    handle: '@styledbysanj',
  },
  {
    quote: 'I love how I can trust the quality without scrolling for hours. Checkout was insanely smooth.',
    author: 'Prakash M., Pokhara',
    handle: '@prakashmakes',
  },
  {
    quote: 'The floating chat helped me pick sizes in minutes. Wish every store cared this much.',
    author: 'Meera A., Lalitpur',
    handle: '@meera.moves',
  },
]

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: categories, isLoading: catsLoading } = useQuery({ queryKey: ['cats'], queryFn: fetchCategories })
  const trending = useQuery({ queryKey: ['trending'], queryFn: () => fetchProducts({ page_size: 12, ordering: '-avg_rating' }) })
  const newArrivals = useQuery({ queryKey: ['new-arrivals'], queryFn: () => fetchProducts({ page_size: 8, ordering: '-created_at' }) })

  const topCategories = useMemo(() => (categories || []).slice(0, 6), [categories])

  return (
    <main className="flex flex-col gap-24 pb-24">
      <Hero />

      <section className="mx-auto w-full max-w-7xl px-6">
        <SectionTitle
          eyebrow="Trending Now"
          title="This week’s most loved drops"
          description="Handpicked by our community for quality, functionality, and that wow-factor on your feed."
        />
        <div className="mt-10 rounded-3xl border border-primary-100/40 bg-white/80 p-6 shadow-card backdrop-blur">
          {trending.isLoading ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-3xl bg-neutral-100" />
              ))}
            </div>
          ) : (
            <Carousel items={(trending.data?.results ?? []).slice(0, 12)} />
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6">
        <SectionTitle
          eyebrow="Categories"
          title="Browse by mood and lifestyle"
          description="Curated collections to match your vibe—study, gym, creator lab, or weekend adventures."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {topCategories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="group relative overflow-hidden rounded-3xl border border-neutral-100 bg-white/70 p-6 shadow-card backdrop-blur"
            >
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-neutral-900">{category.name}</h3>
                <p className="text-sm text-neutral-500">{t('home.categoriesSubtitle', 'Fresh picks updated weekly')}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
                  onClick={() => navigate(`/c/${category.slug}`)}
                >
                  {t('actions.shopNow', 'Explore collection')}
                </Button>
              </div>
              <div className="pointer-events-none absolute -right-6 bottom-0 h-32 w-32 rounded-full bg-gradient-primary opacity-30 blur-2xl transition group-hover:opacity-60" />
            </motion.div>
          ))}
          {catsLoading && (
            <div className="rounded-3xl border border-dashed border-neutral-200 p-6 text-sm text-neutral-400">
              {t('status.loading')}…
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6">
        <SectionTitle
          eyebrow="Why shoppers choose us"
          title="Design-first experience with zero compromise"
          description="We obsess over the details so you don’t have to—from speed to sustainability."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {benefits.map((benefit, idx) => (
            <GlassCard key={benefit.title} className="p-6">
              <div className="text-3xl">{benefit.icon}</div>
              <h3 className="mt-4 text-lg font-semibold text-neutral-900">{benefit.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{benefit.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6">
        <SectionTitle
          eyebrow="Fresh drop"
          title="New arrivals waiting to be unboxed"
          description="Limited-run essentials crafted with premium materials and made for daily use."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3 lg:grid-cols-4">
          {(newArrivals.data?.results ?? []).map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
          {newArrivals.isLoading && Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-3xl bg-neutral-100" />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6">
        <SectionTitle
          eyebrow="Proof"
          title="Loved by the community"
          description="Social shoppers and creators share how Dropshipper fits into their daily ritual."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map(testimonial => (
            <GlassCard key={testimonial.author} className="p-6">
              <p className="text-sm text-neutral-600">“{testimonial.quote}”</p>
              <div className="mt-4 text-sm font-semibold text-neutral-900">
                {testimonial.author}
              </div>
              <div className="text-xs uppercase tracking-[0.3em] text-neutral-400">{testimonial.handle}</div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6">
        <div className="glass-panel overflow-hidden p-8 text-neutral-900 shadow-glow">
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <p className="section-heading">Stay in the Loop</p>
              <h3 className="headline">Join the Sunday Drop newsletter</h3>
              <p className="mt-3 text-sm text-neutral-600">
                Be the first to unlock early access, styling guides, and VIP pricing. We only send mindful, high-signal updates.
              </p>
            </div>
            <form className="rounded-3xl border border-neutral-200 bg-white/70 p-2 shadow-inner backdrop-blur">
              <label htmlFor="email" className="sr-only">Email</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="h-12 flex-1 rounded-2xl border border-transparent bg-white px-4 text-sm text-neutral-700 focus:border-primary-200 focus:outline-none"
                />
                <Button type="submit" className="sm:px-8">Subscribe</Button>
              </div>
              <p className="mt-2 text-xs text-neutral-400">Zero spam. Unsubscribe anytime.</p>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}
