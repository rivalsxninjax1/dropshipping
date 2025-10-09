import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '../../components/AdminLayout'
import {
  fetchAdminCategories,
  createAdminCategory,
  updateAdminCategory,
} from '../../api/admin'
import Button from '../../components/Button'

type CategoryFormState = {
  name: string
  tagline: string
  hero_image: string
  display_order: string
  parent: string
  is_trending: boolean
}

const initialForm: CategoryFormState = {
  name: '',
  tagline: '',
  hero_image: '',
  display_order: '0',
  parent: '',
  is_trending: false,
}

export default function AdminCategories() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<CategoryFormState>(initialForm)

  const categoriesQuery = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchAdminCategories,
    keepPreviousData: true,
  })

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createAdminCategory(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      setForm(initialForm)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateAdminCategory(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  })

  const categories = useMemo(() => {
    const results = categoriesQuery.data?.results ?? categoriesQuery.data ?? []
    if (!search.trim()) return results
    const needle = search.toLowerCase()
    return results.filter((cat: any) => cat.name.toLowerCase().includes(needle) || cat.slug.toLowerCase().includes(needle))
  }, [categoriesQuery.data, search])

  const handleChange = (name: keyof CategoryFormState, value: string | boolean) => {
    setForm(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) return

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      slug: slugify(form.name),
      tagline: form.tagline.trim(),
      hero_image: form.hero_image.trim(),
      display_order: Number(form.display_order || 0),
      parent: form.parent ? Number(form.parent) : null,
      is_trending: form.is_trending,
    }
    if (!payload.tagline) delete payload.tagline
    if (!payload.hero_image) delete payload.hero_image
    if (!payload.parent) payload.parent = null

    createMutation.mutate(payload)
  }

  const parentOptions = categoriesQuery.data?.results ?? categoriesQuery.data ?? []

  const resolveParentName = (parentId: number | null | undefined) => {
    if (!parentId) return '—'
    const found = parentOptions?.find((cat: any) => cat.id === parentId)
    return found?.name ?? `#${parentId}`
  }

  return (
    <AdminLayout
      title="Categories"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['admin-categories'] })}>
            Refresh
          </Button>
        </div>
      }
    >
      <section className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">Search</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search categories by name or slug"
            className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/40">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Name</label>
            <input
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="Summer collection"
              required
              className="mt-1 w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Display order</label>
            <input
              type="number"
              min="0"
              value={form.display_order}
              onChange={e => handleChange('display_order', e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Parent category</label>
            <select
              value={form.parent}
              onChange={e => handleChange('parent', e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">None</option>
              {parentOptions
                ?.filter((cat: any) => cat.name !== form.name)
                .map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Tagline (optional)</label>
            <input
              value={form.tagline}
              onChange={e => handleChange('tagline', e.target.value)}
              placeholder="Short hero copy"
              className="mt-1 w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Hero image URL</label>
            <input
              value={form.hero_image}
              onChange={e => handleChange('hero_image', e.target.value)}
              placeholder="https://"
              className="mt-1 w-full rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <input
              type="checkbox"
              checked={form.is_trending}
              onChange={e => handleChange('is_trending', e.target.checked)}
            />
            Mark as trending
          </label>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding…' : 'Add category'}
            </Button>
          </div>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        {categoriesQuery.isLoading ? (
          <div className="px-6 py-8 text-sm text-neutral-500">Loading categories…</div>
        ) : (
          <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Parent</th>
                <th className="px-4 py-3 text-left font-semibold">Order</th>
                <th className="px-4 py-3 text-left font-semibold">Trending</th>
                <th className="px-4 py-3 text-left font-semibold">Slug</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {categories.map((category: any) => (
                <tr key={category.id} className="hover:bg-neutral-50 transition dark:hover:bg-neutral-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{category.name}</div>
                    {category.tagline && <div className="text-xs text-neutral-500">{category.tagline}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{resolveParentName(category.parent)}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      defaultValue={category.display_order ?? 0}
                      onBlur={e =>
                        updateMutation.mutate({
                          id: category.id,
                          payload: { display_order: Number(e.target.value || 0) },
                        })
                      }
                      className="w-20 rounded border px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        category.is_trending
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700/50 dark:text-neutral-300'
                      }`}
                      onClick={() =>
                        updateMutation.mutate({
                          id: category.id,
                          payload: { is_trending: !category.is_trending },
                        })
                      }
                    >
                      {category.is_trending ? 'Trending' : 'Standard'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{category.slug}</td>
                </tr>
              ))}
              {!categories.length && !categoriesQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-neutral-500">
                    No categories match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </AdminLayout>
  )
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
