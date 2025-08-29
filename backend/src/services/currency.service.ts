import { parseNumber } from '../utils/currency'

// Simple currency conversion service using env-provided rates.
// Set FX_RATES_JSON as a JSON object like: { "USD": 1, "EUR": 0.9, "INR": 83.2 }
// Base currency is defined by FX_BASE (default: USD). All rates are relative to base.

export function getFxRates() {
  try {
    const raw = process.env.FX_RATES_JSON || '{}'
    return JSON.parse(raw || '{}') as Record<string, number>
  } catch {
    return {} as Record<string, number>
  }
}

export function getBaseCurrency() {
  return process.env.FX_BASE || 'USD'
}

export function convertCurrency(amount: number, from: string, to: string): number {
  const amt = parseNumber(amount)
  const base = getBaseCurrency().toUpperCase()
  const rates = getFxRates()

  const f = (from || base).toUpperCase()
  const t = (to || base).toUpperCase()
  if (f === t) return amt

  const rFrom = f === base ? 1 : parseNumber(rates[f])
  const rTo = t === base ? 1 : parseNumber(rates[t])
  if (!rFrom || !rTo) return amt // fallback: no conversion

  // Convert from->base->to
  const inBase = amt / rFrom
  return inBase * rTo
}

export function format(amount: number, currency?: string, locale?: string) {
  // Reuse utils implementation via import if desired; duplicating to avoid circular deps
  const value = Number(amount ?? 0)
  const cur = (currency || process.env.CURRENCY_DEFAULT || 'INR').toUpperCase()
  const loc = locale || process.env.LOCALE_DEFAULT || 'en-IN'
  try {
    return new Intl.NumberFormat(loc, { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(value)
  } catch {
    return value.toFixed(2)
  }
}
