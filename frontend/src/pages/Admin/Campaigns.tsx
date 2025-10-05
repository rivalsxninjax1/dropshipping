import { useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import Button from '../../components/Button'

export default function AdminCampaigns() {
  const [subject, setSubject] = useState('')
  const [audience, setAudience] = useState('all')
  const [message, setMessage] = useState('')

  const sendTest = () => {
    alert('Campaign scheduling is coming soon. This is a stub action.')
  }

  return (
    <AdminLayout title="Campaigns">
      <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <h3 className="text-base font-semibold">Email campaign</h3>
        <p className="mt-1 text-xs text-neutral-500">Send targeted marketing emails to your customers.</p>
        <div className="mt-4 grid gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-neutral-500">Subject</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} className="rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Spring sale is live!" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-neutral-500">Audience</span>
            <select value={audience} onChange={e => setAudience(e.target.value)} className="rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
              <option value="all">All customers</option>
              <option value="high-value">High-value customers</option>
              <option value="abandoned">Abandoned carts</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-neutral-500">Message</span>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} className="rounded border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800" placeholder="Write something compelling..." />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setSubject(''); setAudience('all'); setMessage('') }}>Clear</Button>
          <Button onClick={sendTest}>Send preview</Button>
        </div>
      </div>
    </AdminLayout>
  )
}
