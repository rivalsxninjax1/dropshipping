import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWishlist, removeFromWishlist, addToCart } from '../../api'
import AccountLayout from '../../components/AccountLayout'
import ProductCard from '../../components/ProductCard'
import { useTranslation } from 'react-i18next'
import Button from '../../components/Button'
import { useToast } from '../../components/Toast'

export default function AccountWishlist() {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['wishlist'], queryFn: fetchWishlist })

  const removeMutation = useMutation({
    mutationFn: (productId: number) => removeFromWishlist(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] })
  })

  const addMutation = useMutation({
    mutationFn: (productId: number) => addToCart(productId, 1),
    onSuccess: async () => {
      toast.notify(t('actions.addToCart'))
      await qc.invalidateQueries({ queryKey: ['cart'] })
    }
  })

  const items = data?.items ?? []

  return (
    <AccountLayout title={t('account.wishlist.title')} description={t('account.wishlist.empty')}>
      {isLoading ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">{t('status.loading')}…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-6 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">{t('account.wishlist.empty')}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {items.map(item => (
            <div key={item.id} className="relative">
              <ProductCard product={item.product} />
              <div className="absolute inset-x-3 bottom-3 z-10 flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); addMutation.mutate(item.product.id) }}
                >
                  {t('actions.addToCart')}
                </Button>
                <Button
                  variant="outline"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); removeMutation.mutate(item.product.id) }}
                >
                  {t('actions.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountLayout>
  )
}
