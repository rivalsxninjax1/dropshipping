import { Link, useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { fetchProduct, addToCart, fetchProducts, addToWishlist } from '../api'
import ProductGallery from '../components/ProductGallery'
import { track } from '../analytics'
import Button from '../components/Button'
import ProductCard from '../components/ProductCard'
import { useToast } from '../components/Toast'
import { useUIStore } from '../store/ui'
import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { useAuthStore } from '../store/auth'
import { convertUsdToNpr, formatNpr, formatUsdAsNpr } from '../utils/currency'

export default function ProductDetail() {
  const { slug } = useParams()
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const isAuthenticated = !!useAuthStore(s => s.accessToken)
  const { data: product, isLoading, error, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => fetchProduct(slug!),
    enabled: Boolean(slug),
    retry: (failureCount, err) => {
      const status = (err as AxiosError)?.response?.status
      // Do not spam retries for 4xx client errors – surface these immediately.
      if (status && status >= 400 && status < 500) {
        return false
      }
      return failureCount < 2
    },
  })
  const toast = useToast()
  const navigate = useNavigate()
  const openCart = useUIStore(s => s.openCart)

  const related = useQuery({
    enabled: !!product?.category?.slug,
    queryKey: ['related', product?.category?.slug],
    queryFn: () => fetchProducts({ category: product?.category?.slug, page_size: 8 })
  })

  const add = useMutation({
    mutationFn: (vars: { id: number; qty: number }) => addToCart(vars.id, vars.qty),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      toast.notify(t('actions.addToCart'))
      openCart()
    }
  })

  const wishlistMutation = useMutation({
    mutationFn: (productId: number) => addToWishlist(productId),
    onSuccess: () => toast.notify(t('account.wishlist.title')),
    onError: () => toast.notify(t('status.error')),
  })

  const variantOptions = useMemo(() => {
    const raw = (product?.attributes as any)?.variants
    if (Array.isArray(raw)) return raw
    return []
  }, [product])
  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [mediaTab, setMediaTab] = useState<'images' | 'video' | 'ar'>('images')

  const galleryImages = useMemo(() => {
    if (!product) return [] as string[]
    const base = product.images ? [product.images] : []
    const gallery = Array.isArray(product.gallery) ? product.gallery.filter(Boolean) : []
    return [...base, ...gallery]
  }, [product])

  const shippingEta = useMemo(() => {
    if (!product?.shipping_time_min_days || !product?.shipping_time_max_days) {
      return t('status.loading')
    }
    return `${product.shipping_time_min_days} - ${product.shipping_time_max_days} days`
  }, [product?.shipping_time_min_days, product?.shipping_time_max_days, t])

  const attributeEntries = useMemo(() => {
    if (!product?.attributes || typeof product.attributes !== 'object') {
      return [] as Array<[string, unknown]>
    }
    return Object.entries(product.attributes).filter(([key, value]) => {
      if (key.toLowerCase() === 'variants') return false
      if (value === null || value === undefined) return false
      if (typeof value === 'string' && value.trim() === '') return false
      return true
    }) as Array<[string, unknown]>
  }, [product?.attributes])

  const formatAttributeValue = (value: unknown, key?: string) => {
    const lowered = key?.toLowerCase() ?? ''
    const treatAsCurrency = lowered.includes('price') || lowered.includes('cost') || lowered.includes('amount')
    if (Array.isArray(value)) {
      return value.filter(Boolean).join(', ')
    }
    if (typeof value === 'boolean') {
      return value ? t('status.yes', { defaultValue: 'Yes' }) : t('status.no', { defaultValue: 'No' })
    }
    if (treatAsCurrency && (typeof value === 'string' || typeof value === 'number')) {
      return formatUsdAsNpr(value, i18n.language)
    }
    if (value && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).filter(Boolean).join(', ')
    }
    return String(value)
  }

  const highlights = useMemo(() => {
    const entries = attributeEntries.slice(0, 5)
    if (entries.length === 0) {
      return [
        t('product.defaultHighlights.quality', { defaultValue: 'Crafted with premium materials to handle Himalayan weather.' }),
        t('product.defaultHighlights.shipping', { defaultValue: 'Nationwide delivery within 2-5 days via trusted Nepali couriers.' }),
        t('product.defaultHighlights.support', { defaultValue: 'Friendly local support team available 7 days a week.' }),
      ]
    }
    return entries.map(([key, value]) => `${humanizeKey(key)}: ${formatAttributeValue(value, key)}`)
  }, [attributeEntries, i18n.language, t])

  const specRows = useMemo(() => {
    if (attributeEntries.length === 0) return [] as Array<{ label: string; value: string }>
    return attributeEntries.map(([key, value]) => ({
      label: humanizeKey(key),
      value: formatAttributeValue(value, key),
    }))
  }, [attributeEntries, i18n.language])

  const priceDisplay = useMemo(() => formatUsdAsNpr(product?.base_price ?? 0, i18n.language), [product?.base_price, i18n.language])
  const freeDeliveryThreshold = useMemo(() => formatNpr(5000, i18n.language), [i18n.language])

  if (isError) {
    const status = (error as AxiosError | undefined)?.response?.status
    if (status === 404) {
      return (
        <div className="mx-auto max-w-4xl space-y-4 p-6 text-center text-sm text-neutral-600">
          <p className="text-lg font-semibold text-neutral-800">{t('status.notFound', { defaultValue: 'Product not found' })}</p>
          <p>{t('product.notFoundHelp', { defaultValue: 'The item you are looking for might have been moved or is no longer available.' })}</p>
          <Button onClick={() => navigate('/products')} variant="secondary">{t('actions.browseProducts', { defaultValue: 'Browse products' })}</Button>
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6 text-center text-sm text-neutral-600">
        <p className="text-lg font-semibold text-neutral-800">{t('status.error')}</p>
        <p>{t('status.retrySoon', { defaultValue: 'Something went wrong. Please try again in a moment.' })}</p>
        <Button onClick={() => qc.invalidateQueries({ queryKey: ['product', slug] })} variant="secondary">{t('actions.retry', { defaultValue: 'Retry' })}</Button>
      </div>
    )
  }

  if (isLoading || !product) {
    return <div className="mx-auto max-w-6xl p-6 text-sm text-neutral-500">{t('status.loading')}...</div>
  }

  const handleAddToCart = (qty = 1) => {
    add.mutate({ id: product.id, qty })
    track('add_to_cart', {
      item_id: product.sku,
      value: convertUsdToNpr(product.base_price),
      currency: 'NPR',
      quantity: qty,
      variant: selectedVariant,
    })
  }

  return (
    <div className="bg-neutral-50 pb-16 dark:bg-neutral-950">
      <nav className="border-b bg-white/90 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/90">
        <ol className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 text-xs font-medium text-neutral-500">
          <li>
            <Link className="transition hover:text-primary-600" to="/">{t('common.home', { defaultValue: 'Home' })}</Link>
          </li>
          <li className="text-neutral-400">/</li>
          <li>
            <Link className="transition hover:text-primary-600" to={product.category ? `/c/${product.category.slug}` : '/products'}>
              {product.category?.name || t('product.collection', { defaultValue: 'Collection' })}
            </Link>
          </li>
          <li className="text-neutral-400">/</li>
          <li className="text-neutral-800 dark:text-neutral-200">{product.title}</li>
        </ol>
      </nav>

      <header className="border-b bg-white py-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary-500">{t('product.featured', { defaultValue: 'Featured product' })}</p>
            <h1 className="mt-2 text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">{product.title}</h1>
          </div>
          <div className="flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-300">
            <div>
              <p className="text-xs uppercase text-neutral-400">{t('product.sku')}</p>
              <p className="font-semibold text-neutral-800 dark:text-neutral-100">{product.sku}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-neutral-400">{t('product.category', { defaultValue: 'Category' })}</p>
              <p className="font-semibold text-neutral-800 dark:text-neutral-100">{product.category?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-neutral-400">{t('product.availability', { defaultValue: 'Availability' })}</p>
              <p className="font-semibold text-emerald-600">{t('product.inStock', { defaultValue: 'In stock' })}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-10 lg:pt-14">
        <div className="gap-10 lg:grid lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6 lg:space-y-8">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-6 flex flex-wrap gap-2 text-xs font-medium text-neutral-500">
                <span className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-primary-600 dark:border-primary-500/40 dark:bg-primary-500/10">{t('product.guarantee', { defaultValue: '7-day hassle-free exchange' })}</span>
                <span className="rounded-full border border-neutral-200 px-3 py-1 dark:border-neutral-700">{t('product.freeShipping', { amount: freeDeliveryThreshold, defaultValue: `Free delivery across Nepal on orders above ${freeDeliveryThreshold}` })}</span>
                <span className="rounded-full border border-neutral-200 px-3 py-1 dark:border-neutral-700">{t('product.support', { defaultValue: 'Nepal-based support, 7 days a week' })}</span>
              </div>

              <div className="overflow-hidden rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700">
                <div className="flex gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs uppercase tracking-wide dark:border-neutral-800 dark:bg-neutral-800/40">
                  <MediaTab label={t('product.media.image')} value="images" current={mediaTab} onClick={setMediaTab} />
                  <MediaTab label={t('product.media.video')} value="video" current={mediaTab} onClick={setMediaTab} disabled={!product.video_url} />
                  <MediaTab label={t('product.media.ar')} value="ar" current={mediaTab} onClick={setMediaTab} />
                </div>
                <div className="bg-white dark:bg-neutral-900">
                  {mediaTab === 'images' && <ProductGallery images={galleryImages} />}
                  {mediaTab === 'video' && (
                    <div className="aspect-video w-full overflow-hidden bg-neutral-900">
                      {product.video_url ? (
                        <iframe
                          title={product.title}
                          src={product.video_url}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-white/70">{t('status.loading')}…</div>
                      )}
                    </div>
                  )}
                  {mediaTab === 'ar' && (
                    <div className="flex aspect-square items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
                      360° preview coming soon
                    </div>
                  )}
                </div>
              </div>
            </div>

            <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{t('product.overview', { defaultValue: 'Product overview' })}</h2>
              <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{product.description || t('product.placeholderDescription', { defaultValue: 'Detailed description coming soon.' })}</p>

              <dl className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">{t('product.brand', { defaultValue: 'Brand' })}</dt>
                  <dd className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">{product.brand || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">{t('product.shipping', { defaultValue: 'Estimated delivery' })}</dt>
                  <dd className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">{shippingEta}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">{t('product.dimensions', { defaultValue: 'Dimensions' })}</dt>
                  <dd className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">{product.dimensions || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">{t('product.weight', { defaultValue: 'Weight' })}</dt>
                  <dd className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">{product.weight ?? '—'}</dd>
                </div>
              </dl>
            </article>

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{t('product.reviews')}</h2>
                <button className="text-sm font-medium text-primary-600 hover:underline">
                  {t('product.writeReview')}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-neutral-600 dark:text-neutral-300">
                <div className="flex items-center gap-2 text-2xl font-semibold text-neutral-900 dark:text-white">
                  {typeof product.avg_rating === 'number' ? product.avg_rating.toFixed(1) : '—'}
                  <span className="text-yellow-500">★</span>
                </div>
                <p>{t('product.trustBadge', { defaultValue: 'Trusted by thousands of happy customers worldwide.' })}</p>
              </div>
              <div className="mt-6 grid gap-4 text-sm text-neutral-600 dark:text-neutral-300 sm:grid-cols-2">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('product.shippingExperience', { defaultValue: 'Shipping experience' })}</h3>
                  <p className="mt-2 leading-relaxed">{t('product.shippingExperienceCopy', { defaultValue: 'Fast, tracked shipping with live notifications and flexible delivery options.' })}</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('product.qualityAssurance', { defaultValue: 'Quality assurance' })}</h3>
                  <p className="mt-2 leading-relaxed">{t('product.qualityAssuranceCopy', { defaultValue: 'Each item is inspected against a 32‑point checklist to ensure flawless quality.' })}</p>
                </div>
              </div>
            </section>
          </section>

          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-md shadow-primary-500/5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-600">{t('product.priceLabel', { defaultValue: 'Your price' })}</p>
                  <p className="mt-1 text-3xl font-bold text-neutral-900 dark:text-white">{priceDisplay}</p>
                </div>
                <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {t('product.inStock', { defaultValue: 'In stock' })}
                </div>
              </div>

              {variantOptions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs uppercase tracking-wide text-neutral-500">{t('product.variants')}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {variantOptions.map((variant: any) => {
                      const label = String(variant.label || variant.name || variant)
                      const isActive = selectedVariant === label
                      return (
                        <button
                          key={variant.id || label}
                          onClick={() => setSelectedVariant(label)}
                          className={`rounded-full border px-3 py-1 text-sm transition ${
                            isActive
                              ? 'border-primary-500 bg-primary-50 text-primary-600 shadow-sm dark:border-primary-400 dark:bg-primary-500/10'
                              : 'border-neutral-300 text-neutral-700 hover:border-primary-400 hover:text-primary-600 dark:border-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6 grid gap-3">
                <Button aria-label={t('actions.addToCart')} onClick={() => handleAddToCart(1)}>
                  {t('actions.addToCart')}
                </Button>
                <Button variant="secondary" onClick={async () => {
                  try {
                    await add.mutateAsync({ id: product.id, qty: 1 })
                    navigate('/checkout')
                  } catch {}
                }}>
                  {t('actions.buyNow')}
                </Button>
                {isAuthenticated && (
                  <Button variant="outline" onClick={() => wishlistMutation.mutate(product.id)} disabled={wishlistMutation.isPending}>
                    {wishlistMutation.isPending ? t('status.loading') : t('actions.addToWishlist')}
                  </Button>
                )}
              </div>

              <div className="mt-6 grid gap-3 text-sm text-neutral-600 dark:text-neutral-300">
                <BadgeLine title={t('product.secureCheckout', { defaultValue: 'Secure checkout' })} description={t('product.secureCheckoutCopy', { defaultValue: 'SSL encrypted | eSewa, Khalti, FonePay, cards & COD supported.' })} />
                <BadgeLine title={t('product.fastDispatch', { defaultValue: 'Quick dispatch' })} description={t('product.fastDispatchCopy', { defaultValue: 'Orders confirmed before 3 PM dispatch the same day from Kathmandu.' })} />
                <BadgeLine title={t('product.flexReturns', { defaultValue: 'Flexible returns' })} description={t('product.flexReturnsCopy', { defaultValue: 'Easy returns within 7 days in Kathmandu valley, courier-assisted pickups nationwide.' })} />
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">{t('product.highlights', { defaultValue: 'Highlights' })}</h3>
              <ul className="mt-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
                {highlights.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="mt-1 inline-flex h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">{t('product.customerCare', { defaultValue: 'Customer care' })}</h3>
              <div className="mt-4 space-y-4 text-sm text-neutral-600 dark:text-neutral-300">
                <p>{t('product.customerCareCopy', { defaultValue: 'Need advice? Chat with a product specialist or schedule a one-on-one virtual fitting.' })}</p>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-800/40">
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">{t('product.responseTime', { defaultValue: 'Response time' })}</p>
                  <p>{t('product.responseTimeCopy', { defaultValue: 'Under 5 minutes during business hours.' })}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-12 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{t('product.specifications', { defaultValue: 'Detailed specifications' })}</h2>
          {specRows.length > 0 ? (
            <dl className="mt-6 divide-y divide-neutral-200 dark:divide-neutral-800">
              {specRows.map(row => (
                <div key={row.label} className="flex flex-col gap-2 py-4 sm:grid sm:grid-cols-[200px_1fr] sm:items-start">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{row.label}</dt>
                  <dd className="text-sm text-neutral-700 dark:text-neutral-200">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">{t('product.specificationsPlaceholder', { defaultValue: 'We are preparing an in-depth spec sheet for this product.' })}</p>
          )}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-3">
          <InfoCard
            title={t('product.shippingTitle', { defaultValue: 'Shipping & delivery' })}
            copy={t('product.shippingCopy', { amount: freeDeliveryThreshold, defaultValue: `Free delivery across Nepal for orders above ${freeDeliveryThreshold}. Express upgrades via Aramex & NepXpress.` })}
          />
          <InfoCard
            title={t('product.returnsTitle', { defaultValue: 'Returns & exchanges' })}
            copy={t('product.returnsCopy', { defaultValue: 'Try it at home. If the fit is off, exchange or refund within 7 days with easy courier pickups.' })}
          />
          <InfoCard
            title={t('product.sustainabilityTitle', { defaultValue: 'Sustainably made' })}
            copy={t('product.sustainabilityCopy', { defaultValue: 'Manufactured in audited facilities with traceable materials and minimal packaging waste.' })}
          />
        </section>

        <section className="mt-14 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{t('product.related')}</h2>
              <p className="text-sm text-neutral-500">{t('product.relatedCopy', { defaultValue: 'Complete the look with items our customers pair together.' })}</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/products')}>
              {t('product.exploreMore', { defaultValue: 'Explore catalog' })}
            </Button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(related.data?.results ?? []).filter(p => p.id !== product.id).slice(0, 8).map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
            {related.isLoading && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl border border-dashed border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800" />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function MediaTab({ label, value, current, onClick, disabled }: { label: string; value: 'images' | 'video' | 'ar'; current: string; onClick: (value: any) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onClick(value)}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wide ${current === value ? 'border-primary-500 bg-primary-50 text-primary-600 dark:border-primary-500 dark:bg-primary-500/10' : 'border-neutral-300 text-neutral-500 dark:border-neutral-700 dark:text-neutral-300'} ${disabled ? 'opacity-40' : ''}`}
    >
      {label}
    </button>
  )
}

function BadgeLine({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="font-semibold text-neutral-800 dark:text-neutral-100">{title}</p>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{description}</p>
    </div>
  )
}

function InfoCard({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{copy}</p>
    </div>
  )
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, char => char.toUpperCase())
}
