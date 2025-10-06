import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchBundle } from '../api'
import Seo from '../components/Seo'
import ProductCard from '../components/ProductCard'
import Button from '../components/Button'
import { useTranslation } from 'react-i18next'
import { formatUsdAsNpr } from '../utils/currency'

export default function BundleDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading, error } = useQuery({ queryKey: ['bundle', slug], queryFn: () => fetchBundle(slug!), enabled: Boolean(slug) })

  if (isLoading) {
    return <div className="mx-auto max-w-5xl p-6 text-sm text-neutral-500">{t('status.loading')}…</div>
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6 text-center">
        <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">{t('bundle.notFound', { defaultValue: 'Bundle not found' })}</p>
        <Button variant="secondary" onClick={() => navigate('/')}>
          {t('actions.backHome')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-6 py-12">
      <Seo title={`${data.title}`} description={data.tagline || data.description} />
      <header className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary-500">{t('bundle.curated', { defaultValue: 'Curated bundle' })}</p>
        <h1 className="mt-2 text-3xl font-semibold text-neutral-900 dark:text-neutral-50">{data.title}</h1>
        {data.tagline && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{data.tagline}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-600 dark:text-neutral-300">
          <span>{t('bundle.includes', { defaultValue: '{{count}} products', count: data.items.length })}</span>
          <span>{t('bundle.price', { defaultValue: 'Bundle price: {{price}}', price: formatUsdAsNpr(data.final_price) })}</span>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map(bundleItem => (
          <ProductCard key={bundleItem.product.id} product={bundleItem.product} />
        ))}
      </section>
    </div>
  )
}
