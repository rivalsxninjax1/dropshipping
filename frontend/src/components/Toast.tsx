import React, { createContext, useContext, useState } from 'react'

type ToastMsg = { id: number; message: string }
const ToastCtx = createContext<{ notify: (m: string) => void } | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  function notify(message: string) {
    const id = Date.now()
    setToasts(t => [...t, { id, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }
  return (
    <ToastCtx.Provider value={{ notify }}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className="rounded bg-gray-900 px-3 py-2 text-sm text-white shadow">{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('ToastProvider missing')
  return ctx
}

