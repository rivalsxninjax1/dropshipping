declare global {
  interface Window { dataLayer: any[]; gtag: (...args: any[]) => void }
}

export function initAnalytics() {
  const id = import.meta.env.VITE_GA_ID as string | undefined
  if (!id) return
  window.dataLayer = window.dataLayer || []
  function gtag(){ window.dataLayer.push(arguments) }
  window.gtag = gtag as any
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  document.head.appendChild(s)
  gtag('js', new Date())
  gtag('config', id)
}

export function track(event: string, params?: Record<string, any>) {
  if (window.gtag) window.gtag('event', event, params || {})
}

