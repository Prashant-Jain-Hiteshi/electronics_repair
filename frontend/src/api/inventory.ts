import { api } from './client'

export type InventoryItem = {
  id: string
  name: string
  sku?: string
  deviceType?: string
  brand?: string
  model?: string
  locationId?: string
  quantity?: number
  availableQty?: number
}

export type InventoryReservation = {
  id: string
  inventoryId: string
  repairOrderId: string
  status: 'reserved' | 'picked' | 'consumed' | 'cancelled'
  reservedQty: number
  barcode?: string
  createdAt: string
  updatedAt: string
  inventory?: InventoryItem
}

export async function listInventory(params?: Record<string, any>): Promise<InventoryItem[]> {
  const { data } = await api.get('/inventory', { params })
  return data?.items || data || []
}

export async function listReservations(params?: Record<string, any>): Promise<InventoryReservation[]> {
  const { data } = await api.get('/inventory/reservations', { params })
  return data?.reservations || data || []
}

export async function listUsage(inventoryId: string) {
  const { data } = await api.get(`/inventory/${inventoryId}/usage`)
  return data
}

export async function reservePart(inventoryId: string, payload: { repairOrderId: string; qty: number }) {
  const { data } = await api.post(`/inventory/${inventoryId}/reserve`, payload)
  return data as InventoryReservation
}

export async function cancelReservation(reservationId: string) {
  const { data } = await api.post(`/inventory/reservations/${reservationId}/cancel`, {})
  return data as InventoryReservation
}

export async function pickReservation(reservationId: string) {
  const { data } = await api.post(`/inventory/reservations/${reservationId}/pick`, {})
  return data as InventoryReservation
}

export async function consumeReservation(reservationId: string) {
  const { data } = await api.post(`/inventory/reservations/${reservationId}/consume`, {})
  return data as InventoryReservation
}

export async function scanBarcode(barcode: string) {
  const { data } = await api.post('/inventory/scan', { barcode })
  return data as { reservation?: InventoryReservation; inventory?: InventoryItem }
}

export function getReservationLabelUrl(reservationId: string) {
  // Assumes api baseURL ends with /api
  // We rely on the axios instance baseURL
  const base = (api.defaults.baseURL || '').replace(/\/$/, '')
  return `${base}/inventory/labels/${reservationId}`
}
