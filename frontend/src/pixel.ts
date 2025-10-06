declare global {
  interface Window {
    fbq: (...args: any[]) => void
  }
}

export function initFacebookPixel() {
  const pixelId = import.meta.env.VITE_FB_PIXEL_ID as string | undefined
  if (!pixelId) return

  if (window.fbq) return
  const fb = document.createElement('script')
  fb.async = true
  fb.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(fb)

  window.fbq = function fbq() {
    ;(window.fbq as any).callMethod ? (window.fbq as any).callMethod.apply(window.fbq, arguments as any) : (window.fbq as any).queue.push(arguments)
  } as any
  window.fbq.queue = []
  window.fbq.loaded = true
  window.fbq.version = '2.0'
  window.fbq('init', pixelId)
  window.fbq('track', 'PageView')
}

export function trackPixel(event: string, params?: Record<string, any>) {
  if (typeof window.fbq === 'function') {
    window.fbq('track', event, params || {})
  }
}
