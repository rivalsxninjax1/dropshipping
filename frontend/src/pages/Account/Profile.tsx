import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { me } from '../../api'
import AccountLayout from '../../components/AccountLayout'
import Button from '../../components/Button'
import { useToast } from '../../components/Toast'

export default function AccountProfile() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, isLoading } = useQuery({ queryKey: ['me'], queryFn: me })

  const user = data || {}

  return (
    <AccountLayout title={t('account.profile.title')} description={t('account.profile.save')}>
      <form
        className="grid gap-4 rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
        onSubmit={e => {
          e.preventDefault()
          toast.notify('Profile updates will be available soon.')
        }}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{t('account.profile.name')}</label>
            <input defaultValue={`${user.first_name || ''} ${user.last_name || ''}`} className="mt-1 w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" readOnly />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Email</label>
            <input defaultValue={user.email || ''} className="mt-1 w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" readOnly />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{t('account.profile.phone')}</label>
          <input defaultValue={user.phone || ''} className="mt-1 w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" readOnly />
        </div>
        <Button type="submit" disabled>{isLoading ? t('status.loading') : t('account.profile.save')}</Button>
      </form>
    </AccountLayout>
  )
}
