const FALLBACK_RATE = 133.5

const usdToNprRate = (() => {
  const raw = typeof import.meta !== 'undefined' ? (import.meta as any)?.env?.VITE_USD_TO_NPR : undefined
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_RATE
})()

export function parseAmount(value: string | number): number {
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function convertUsdToNpr(value: string | number): number {
  return parseAmount(value) * usdToNprRate
}

const englishLocaleMatcher = /^en/i

export function formatNpr(amount: string | number, locale = 'en', opts: Intl.NumberFormatOptions = {}): string {
  const parsed = typeof amount === 'number' ? amount : parseAmount(amount)
  const useEnglish = englishLocaleMatcher.test(locale || '')

  try {
    if (useEnglish) {
      const formatted = new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
        ...opts,
      }).format(parsed)
      return `Rs ${formatted}`
    }

    return new Intl.NumberFormat('ne-NP', {
      style: 'currency',
      currency: 'NPR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      ...opts,
    }).format(parsed)
  } catch {
    const fallback = Math.round(parsed).toLocaleString(undefined, { maximumFractionDigits: 0 })
    return useEnglish ? `Rs ${fallback}` : `रु ${fallback}`
  }
}

export function formatUsdAsNpr(amount: string | number, locale = 'en', opts?: Intl.NumberFormatOptions): string {
  return formatNpr(convertUsdToNpr(amount), locale, opts)
}

export const usdToNprMultiplier = usdToNprRate
