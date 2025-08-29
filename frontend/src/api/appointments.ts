import { api } from './client'

export type AppointmentMode = 'repair' | 'estimate'
export type AppointmentStatus = 'scheduled' | 'cancelled' | 'completed' | 'no_show'

export type Appointment = {
  id: string
  customerId: string
  locationId: string
  start: string
  end: string
  status: AppointmentStatus
  mode: AppointmentMode
  intake?: any
  repairOrderId?: string | null
  estimateId?: string | null
  location?: any
  repairOrder?: any
  estimate?: any
}

export type Slot = {
  start: string
  end: string
  capacity: number
  booked: number
  available: number
}

export async function getSlots(params: { locationId: string; from?: string; to?: string }) {
  const res = await api.get<{ locationId: string; slots: Slot[] }>('/appointments/slots', { params })
  return res.data
}

export async function listMyAppointments() {
  const res = await api.get<Appointment[]>('/appointments/mine')
  return res.data
}

export async function getAppointment(id: string) {
  const res = await api.get<Appointment>(`/appointments/${id}`)
  return res.data
}

export async function createAppointment(payload: {
  locationId: string
  start: string
  end?: string
  mode?: AppointmentMode
  intake?: any
}) {
  const res = await api.post<Appointment>('/appointments', payload)
  return res.data
}

export async function updateAppointment(id: string, payload: { start?: string; end?: string }) {
  const res = await api.put<Appointment>(`/appointments/${id}`, payload)
  return res.data
}

export async function cancelAppointment(id: string) {
  const res = await api.put<{ message: string; appointment: Appointment }>(`/appointments/${id}/cancel`)
  return res.data
}
