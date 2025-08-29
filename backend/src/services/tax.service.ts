import TaxProfile from '../models/TaxProfile'

export interface TaxResult {
  taxRatePct: number
  taxAmount: number
  totalWithTax: number
  currencyCode?: string | null
}

export async function getTaxProfile(locationKey: string | null | undefined) {
  if (!locationKey) return null
  const key = String(locationKey).trim()
  if (!key) return null
  const profile = await TaxProfile.findOne({ where: { locationKey: key } })
  return profile
}

export async function computeTax(amount: number, locationKey?: string | null): Promise<TaxResult> {
  const profile = await getTaxProfile(locationKey || null)
  const rate = profile ? Number(profile.taxRate || 0) : 0
  const taxAmount = (Number(amount || 0) * rate) / 100
  return {
    taxRatePct: rate,
    taxAmount,
    totalWithTax: Number(amount || 0) + taxAmount,
    currencyCode: profile?.currencyCode || null,
  }
}
