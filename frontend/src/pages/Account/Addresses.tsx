import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAddresses, createAddress, updateAddress, deleteAddress } from '../../api'
import AccountLayout from '../../components/AccountLayout'
import AddressForm from '../../components/inputs/AddressForm'
import Button from '../../components/Button'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../components/Toast'

export default function AccountAddresses() {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['addresses'], queryFn: fetchAddresses })
  const [form, setForm] = useState<any | null>(null)
  const [mode, setMode] = useState<'create' | 'edit'>('create')

  const closeForm = () => {
    setForm(null)
    setMode('create')
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) return
      if (mode === 'edit' && form.id) {
        await updateAddress(form.id, form)
      } else {
        await createAddress(form)
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['addresses'] })
      toast.notify(t('actions.save'))
      closeForm()
    },
    onError: () => toast.notify(t('status.error')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAddress(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['addresses'] })
      toast.notify(t('actions.delete'))
    },
    onError: () => toast.notify(t('status.error')),
  })

  const addresses = data ?? []

  return (
    <AccountLayout title={t('account.addresses.title')}>
      <div className="flex justify-end">
        <Button onClick={() => { setMode('create'); setForm({ country: 'NP' }); }}>{t('account.addresses.add')}</Button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">{t('status.loading')}…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((addr: any) => (
            <div key={addr.id} className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{addr.label || addr.address_line1}</h3>
                <div className="space-x-2 text-sm">
                  <button onClick={() => { setMode('edit'); setForm({ ...addr }); }} className="text-primary-600 hover:underline">{t('account.addresses.edit')}</button>
                  <button onClick={() => deleteMutation.mutate(addr.id)} className="text-red-600 hover:underline">{t('actions.delete')}</button>
                </div>
              </div>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                {addr.address_line1}, {addr.city}, {addr.state} {addr.postal_code}
              </p>
              <p className="text-xs text-neutral-500">{addr.country}</p>
            </div>
          ))}
          {addresses.length === 0 && (
            <div className="rounded-xl border border-dashed bg-white p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">{t('status.empty')}</div>
          )}
        </div>
      )}

      {form !== null && (
        <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h3 className="mb-3 text-base font-semibold">{mode === 'edit' ? t('account.addresses.edit') : t('account.addresses.add')}</h3>
          <AddressForm value={form} onChange={setForm} />
          <div className="mt-4 flex gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? t('status.loading') : t('actions.save')}</Button>
            <Button variant="outline" onClick={closeForm}>{t('actions.cancel')}</Button>
          </div>
        </div>
      )}
    </AccountLayout>
  )
}
