import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import MobileDrawer from './MobileDrawer'

export default function NavBar() {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b bg-white dark:bg-neutral-900 dark:text-neutral-100">
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
          <Link to="/" className="text-xl font-semibold">Dropshipper</Link>
        </div>
        <ul className="hidden items-center gap-4 md:flex">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/account/orders">Orders</Link></li>
          <li><Link to="/admin/products">Admin</Link></li>
          <li><Link to="/design-system">Design System</Link></li>
        </ul>
      </div>
      <MobileDrawer open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

