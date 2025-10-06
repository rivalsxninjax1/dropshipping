import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { fetchProducts } from '../api'
import ProductCard from '../components/ProductCard'
import Button from '../components/Button'
import { Badge } from '../components/ui/Badge'
import { motion } from 'framer-motion'

const RATING_OPTIONS = [4, 3, 2]

export default function Category() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentPage = Number(searchParams.get('page') || 1)
  const ordering = searchParams.get('ordering') || '-created_at'

  const deriveFilters = () => ({
    priceMin: searchParams.get('price_min') || '',
    priceMax: searchParams.get('price_max') || '',
    brand: searchParams.get('brand') || '',
    supplier: searchParams.get('supplier') || '',
    rating: searchParams.get('rating_min') || '',
    shipping: searchParams.get('shipping_max') || '',
    inStock: searchParams.get('stock') === 'true',
    size: searchParams.get('size') || '',
    color: searchParams.get('color') || '',
  })

  const [filters, setFilters] = useState(deriveFilters)

  useEffect(() => {
    setFilters(deriveFilters())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  const queryFilters = useMemo(() => {
    const params: Record<string, string> = { page: String(currentPage), ordering }
    if (slug) params.category = slug
    if (filters.priceMin) params.price_min = filters.priceMin
    if (filters.priceMax) params.price_max = filters.priceMax
    if (filters.brand) params.brand = filters.brand
    if (filters.supplier) params.supplier = filters.supplier
    if (filters.rating) params.rating_min = filters.rating
    if (filters.shipping) params.shipping_max = filters.shipping
    if (filters.inStock) params.stock = 'true'
    if (filters.size) params.size = filters.size
    if (filters.color) params.color = filters.color
    return params
  }, [slug, currentPage, ordering, filters])

  const { data, isLoading } = useQuery({
    queryKey: ['products', queryFilters],
    queryFn: () => fetchProducts(queryFilters),
  })

  const products = data?.results ?? []
  const totalPages = data?.total_pages ?? 1

  const syncSearch = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(next).forEach(([key, value]) => {
      if (!value) params.delete(key)
      else params.set(key, value)
    })
    params.set('page', '1')
    setSearchParams(params)
  }

  const heading = slug ? slug.replace(/-/g, ' ') : t('nav.products', { defaultValue: 'Products' })

  const clearFilters = () => {
    setFilters({ priceMin: '', priceMax: '', brand: '', supplier: '', rating: '', shipping: '', inStock: false, size: '', color: '' })
    syncSearch({ price_min: undefined, price_max: undefined, brand: undefined, supplier: undefined, rating_min: undefined, shipping_max: undefined, stock: undefined, size: undefined, color: undefined })
  }

  const applyFilters = () => {
    syncSearch({
      price_min: filters.priceMin || undefined,
      price_max: filters.priceMax || undefined,
      brand: filters.brand || undefined,
      supplier: filters.supplier || undefined,
      rating_min: filters.rating || undefined,
      shipping_max: filters.shipping || undefined,
      stock: filters.inStock ? 'true' : undefined,
      size: filters.size || undefined,
      color: filters.color || undefined,
    })
  }

  const updateSort = (value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('ordering', value)
    params.set('page', '1')
    setSearchParams(params)
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(page))
    setSearchParams(params)
  }

  const hasActiveFilters = Boolean(
    filters.priceMin ||
    filters.priceMax ||
    filters.brand ||
    filters.supplier ||
    filters.rating ||
    filters.shipping ||
    filters.inStock ||
    filters.size ||
    filters.color
  )

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12">
      <header className="space-y-4 rounded-3xl bg-white/80 p-8 shadow-card backdrop-blur">
        <Badge variant="outline" className="bg-primary-50 text-primary-600">Curated selection</Badge>
        <h1 className="font-heading text-3xl font-semibold capitalize text-neutral-900">{heading}</h1>
        <div className="flex flex-col gap-4 text-sm text-neutral-500 lg:flex-row lg:items-center lg:justify-between">
          <p>{t('filters.subtitle', 'Refine the drop with precise filters and live inventory insights.')}</p>
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-neutral-500">{t('filters.sort')}</label>
            <select
              id="sort"
              value={ordering}
              onChange={event => updateSort(event.target.value)}
              className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-600 focus:border-primary-200 focus:outline-none"
            >
              <option value="-created_at">{t('filters.sortNewest')}</option>
              <option value="base_price">{t('filters.sortPriceLow')}</option>
              <option value="-base_price">{t('filters.sortPriceHigh')}</option>
              <option value="-avg_rating">{t('filters.sortRating')}</option>
            </select>
          </div>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-6">
          <div className="rounded-3xl border border-neutral-100 bg-white/80 p-6 shadow-card backdrop-blur">
            <h2 className="text-lg font-semibold text-neutral-900">{t('filters.title')}</h2>
            <p className="text-xs text-neutral-400">{t('filters.helper', 'Fine-tune price, rating, delivery, and inventory')}</p>

            <div className="mt-6 space-y-5 text-sm">
              <fieldset>
                <legend className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-400">{t('filters.price')}</legend>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    value={filters.priceMin}
                    onChange={event => setFilters(prev => ({ ...prev, priceMin: event.target.value }))}
                    placeholder={t('filters.priceMin')}
                    className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm focus:border-primary-200 focus:outline-none"
                  />
                  <span className="text-neutral-400">–</span>
                  <input
                    type="number"
                    min={0}
                    value={filters.priceMax}
                    onChange={event => setFilters(prev => ({ ...prev, priceMax: event.target.value }))}
                    placeholder={t('filters.priceMax')}
                    className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm focus:border-primary-200 focus:outline-none"
                  />
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-400">{t('filters.brand')}</legend>
                <input
                  value={filters.brand}
                  onChange={event => setFilters(prev => ({ ...prev, brand: event.target.value }))}
                  placeholder="Nike, Glossier…"
                  className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm focus:border-primary-200 focus:outline-none"
                />
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-400">{t('filters.supplier')}</legend>
                <input
                  value={filters.supplier}
                  onChange={event => setFilters(prev => ({ ...prev, supplier: event.target.value }))}
                  placeholder="AliExpress"
                  className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm focus:border-primary-200 focus:outline-none"
                />
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-400">{t('filters.rating')}</legend>
                <div className="flex flex-wrap gap-2">
                  {RATING_OPTIONS.map(value => {
                    const active = filters.rating === String(value)
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilters(prev => ({ ...prev, rating: String(value) }))}
                        className={
                          active
                            ? 'rounded-full bg-gradient-primary px-4 py-2 text-xs font-semibold text-white shadow-glow'
                            : 'rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-500 hover:border-primary-100 hover:text-primary-600'
                        }
                      >
                        {value}★ & up
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-400">{t('filters.shipping')}</legend>
                <input
                  value={filters.shipping}
                  onChange={event => setFilters(prev => ({ ...prev, shipping: event.target.value }))}
                  placeholder="<= 5 days"
                  className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm focus:border-primary-200 focus:outline-none"
                />
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-400">{t('filters.size')}</legend>
                <input
                  value={filters.size}
                  onChange={event => setFilters(prev => ({ ...prev, size: event.target.value }))}
                  placeholder="S, M, L, XL..."
                  className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm focus:border-primary-200 focus:outline-none"
                />
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-400">{t('filters.color')}</legend>
                <input
                  value={filters.color}
                  onChange={event => setFilters(prev => ({ ...prev, color: event.target.value }))}
                  placeholder="Red, Blue, Black..."
                  className="h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm focus:border-primary-200 focus:outline-none"
                />
              </fieldset>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500">
                <input
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={event => setFilters(prev => ({ ...prev, inStock: event.target.checked }))}
                  className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                />
                {t('filters.inStock')}
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={applyFilters} size="sm">
                {t('actions.apply')}
              </Button>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="ghost" size="sm">
                  {t('actions.reset')}
                </Button>
              )}
            </div>
          </div>
        </aside>

        <section className="space-y-8">
          <div className="flex flex-col gap-4 rounded-3xl border border-neutral-100 bg-white/70 p-6 shadow-card backdrop-blur md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-neutral-500">
              {isLoading ? t('status.loading') : `${products.length} ${t('filters.results', 'results')}`}
            </p>
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2">
                {filters.brand && <Badge variant="outline">Brand: {filters.brand}</Badge>}
                {filters.rating && <Badge variant="outline">{filters.rating}★+</Badge>}
                {filters.inStock && <Badge variant="outline">{t('filters.inStock')}</Badge>}
                {filters.size && <Badge variant="outline">Size: {filters.size}</Badge>}
                {filters.color && <Badge variant="outline">Color: {filters.color}</Badge>}
              </div>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-80 animate-pulse rounded-3xl bg-neutral-100" />
                ))
              : products.map(product => <ProductCard key={product.id} product={product} />)}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1
                const active = page === currentPage
                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={active ? 'rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-white shadow-glow' : 'rounded-full border border-neutral-200 px-4 py-2 text-sm text-neutral-500 hover:border-primary-200 hover:text-primary-600'}
                  >
                    {page}
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
