import { api } from './client'

export interface CustomerDeviceDto {
  id: string
  customerId: string
  deviceType: string
  brand: string
  model: string
  serialNumber?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface DeviceHistoryItem {
  id: string
  status: string
  deviceType: string
  brand: string
  model: string
  serialNumber?: string | null
  createdAt: string
  invoiceUrl: string
}

export async function createDevice(input: { deviceType: string; brand: string; model: string; serialNumber?: string; notes?: string }) {
  const { data } = await api.post<{ device: CustomerDeviceDto }>(`/devices`, input)
  return data.device
}

export async function listMyDevices() {
  const { data } = await api.get<{ devices: CustomerDeviceDto[] }>(`/devices/mine`)
  return data.devices
}

export async function updateDevice(id: string, input: Partial<{ deviceType: string; brand: string; model: string; serialNumber?: string; notes?: string }>) {
  const { data } = await api.put<{ device: CustomerDeviceDto }>(`/devices/${id}`, input)
  return data.device
}

export async function linkDeviceToRepair(id: string, repairId: string) {
  const { data } = await api.post<{ repair: any }>(`/devices/${id}/link/${repairId}`)
  return data.repair
}

export async function getDeviceHistory(id: string) {
  const { data } = await api.get<{ device: CustomerDeviceDto; repairs: DeviceHistoryItem[] }>(`/devices/${id}/history`)
  return data
}
