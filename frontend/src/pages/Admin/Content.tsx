import { useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import Button from '../../components/Button'

export default function AdminContent() {
  const [pageContent, setPageContent] = useState('')
  const [blogContent, setBlogContent] = useState('')

  return (
    <AdminLayout title="CMS & Blog">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h3 className="text-base font-semibold">Static pages</h3>
          <p className="mt-1 text-xs text-neutral-500">Edit informational pages like About, Contact, or Privacy.</p>
          <textarea
            value={pageContent}
            onChange={e => setPageContent(e.target.value)}
            rows={10}
            placeholder="Markdown content..."
            className="mt-3 w-full rounded border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
          <div className="mt-3 flex justify-end">
            <Button variant="secondary" onClick={() => alert('Publishing soon! (stub)')}>Publish</Button>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h3 className="text-base font-semibold">Blog post</h3>
          <p className="mt-1 text-xs text-neutral-500">Draft announcements or SEO content.</p>
          <textarea
            value={blogContent}
            onChange={e => setBlogContent(e.target.value)}
            rows={10}
            placeholder="Write your blog post..."
            className="mt-3 w-full rounded border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBlogContent('')}>Discard</Button>
            <Button onClick={() => alert('Blog scheduling coming soon!')}>Schedule</Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
