import { useQuery } from '@tanstack/react-query'
import { fetchContentPage } from '../api'
import Seo from '../components/Seo'
import { useTranslation } from 'react-i18next'

export default function ReturnPolicy() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useQuery({ queryKey: ['page', 'returns'], queryFn: () => fetchContentPage('returns') })

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <Seo title={t('policy.returnsTitle', { defaultValue: 'Returns & Refunds' })} description={t('policy.returnsDescription', { defaultValue: 'Understand how exchanges, refunds, and COD inspections work at Dropshipper Nepal.' })} />
      {isLoading && <p className="text-sm text-neutral-500">{t('status.loading')}…</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{t('status.error')}</p>}
      {data && (
        <article className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">{data.title}</h1>
            <p className="text-xs text-neutral-500">{t('policy.lastUpdated', { defaultValue: 'Last updated {{date}}', date: new Date(data.updated_at).toLocaleDateString() })}</p>
          </header>
          <section
            className="space-y-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-200"
            dangerouslySetInnerHTML={{ __html: data.body.includes('<') ? data.body : data.body.replace(/\n/g, '<br />') }}
          />
        </article>
      )}
    </div>
  )
}
