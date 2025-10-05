export function formatCurrency(value: number | string, currency = 'USD') {
  const amount = typeof value === 'string' ? Number(value) : value
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0)
}

