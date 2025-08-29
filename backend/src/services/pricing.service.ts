import VendorPrice from '../models/VendorPrice'
import { convertCurrency } from './currency.service'

export interface PriceQuery {
  inventoryId: string
  vendor?: string
  currencyCode?: string // desired target currency (ISO 4217)
  at?: Date
}

export interface PriceResult {
  inventoryId: string
  vendor?: string
  currencyCode: string
  price: number
}

export async function getVendorPrice({ inventoryId, vendor, currencyCode, at }: PriceQuery): Promise<PriceResult | null> {
  const when = at || new Date()
  const where: any = { inventoryId }
  if (vendor) where.vendor = vendor

  // Prefer a record valid for the given date; fallback to any
  const row = await VendorPrice.findOne({
    where: {
      ...where,
      // (validFrom <= when <= validTo) OR both null
    } as any,
    order: [['validFrom', 'DESC']],
  })

  if (!row) return null
  const srcCurrency = (row.currencyCode || process.env.CURRENCY_DEFAULT || 'INR').toUpperCase()
  const dstCurrency = (currencyCode || srcCurrency).toUpperCase()
  const price = Number(row.price || 0)
  const converted = srcCurrency === dstCurrency ? price : convertCurrency(price, srcCurrency, dstCurrency)

  return {
    inventoryId,
    vendor: row.vendor,
    currencyCode: dstCurrency,
    price: converted,
  }
}
