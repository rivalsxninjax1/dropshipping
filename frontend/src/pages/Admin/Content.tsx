import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import AdminLayout from '../../components/AdminLayout'
import Button from '../../components/Button'
import { fetchAdminPages, updateAdminPage } from '../../api/admin'
import { useTranslation } from 'react-i18next'

type Drafts = Record<number, string>

export default function AdminContent() {
  const { t } = useTranslation()
  const { data: pages, isLoading } = useQuery({ queryKey: ['admin-pages'], queryFn: fetchAdminPages })
  const [drafts, setDrafts] = useState<Drafts>({})
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (pages) {
      const initial: Drafts = {}
      pages.forEach((page: any) => {
        initial[page.id] = page.body
      })
      setDrafts(initial)
    }
  }, [pages])

  const mutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) => updateAdminPage(id, { body }),
    onSuccess: () => setStatus('saved'),
    onError: () => setStatus('error'),
  })

  return (
    <AdminLayout title={t('admin.content.title', { defaultValue: 'Content Management' })}>
      {isLoading ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">{t('status.loading')}…</div>
      ) : (
        <div className="space-y-6">
          {pages?.map((page: any) => (
            <div key={page.id} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">{page.title}</h3>
                  <p className="text-xs text-neutral-500">/{page.slug}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => mutation.mutate({ id: page.id, body: drafts[page.id] ?? '' })}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? t('actions.saving', { defaultValue: 'Saving…' }) : t('actions.saveChanges', { defaultValue: 'Save changes' })}
                </Button>
              </div>
              <textarea
                rows={10}
                value={drafts[page.id] ?? ''}
                onChange={event => setDrafts(prev => ({ ...prev, [page.id]: event.target.value }))}
                className="w-full rounded border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary-200 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
              />
              <p className="text-xs text-neutral-400">{t('admin.content.lastUpdated', { defaultValue: 'Last updated {{date}}', date: new Date(page.updated_at).toLocaleString() })}</p>
            </div>
          ))}
          {status === 'saved' && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{t('admin.content.saved', { defaultValue: 'Content updated successfully.' })}</div>}
          {status === 'error' && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">{t('admin.content.error', { defaultValue: 'Failed to update page content.' })}</div>}
        </div>
      )}
    </AdminLayout>
  )
}
