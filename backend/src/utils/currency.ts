export function formatCurrency(amount: number | string | null | undefined, currency?: string, locale?: string) {
  const value = Number(amount ?? 0)
  const cur = currency || process.env.CURRENCY_DEFAULT || 'INR'
  const loc = locale || process.env.LOCALE_DEFAULT || 'en-IN'
  try {
    return new Intl.NumberFormat(loc, { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(value)
  } catch {
    return value.toFixed(2)
  }
}

export function parseNumber(n: any) {
  const v = Number(n)
  return isFinite(v) ? v : 0
}
