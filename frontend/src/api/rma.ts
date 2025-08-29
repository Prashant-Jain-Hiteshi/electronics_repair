import { api } from './client'

export interface WarrantyValidation {
  valid: boolean
  warranty: {
    id: string
    startAt: string
    endAt: string
    periodDays: number
    status: 'active' | 'expired'
  } | null
}

export interface RmaTicketDto {
  id: string
  repairOrderId: string
  customerId: string
  warrantyId?: string | null
  reason?: string | null
  description?: string | null
  status: 'requested' | 'approved' | 'in_progress' | 'rejected' | 'closed'
  attachments?: Array<{ filename: string; originalName: string; mimeType: string; size: number }>
  createdAt: string
  updatedAt: string
}

export async function validateWarranty(repairId: string) {
  const { data } = await api.get<WarrantyValidation>(`/warranty/repairs/${repairId}/validate`)
  return data
}

export async function createRma(input: { repairOrderId: string; reason?: string; description?: string; files?: File[] }) {
  const fd = new FormData()
  fd.append('repairOrderId', input.repairOrderId)
  if (input.reason) fd.append('reason', input.reason)
  if (input.description) fd.append('description', input.description)
  if (input.files && input.files.length) {
    for (const f of input.files) fd.append('files', f, f.name)
  }
  const { data } = await api.post<{ rma: RmaTicketDto }>(`/rma`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  return data.rma
}

export async function listMyRmas() {
  const { data } = await api.get<{ rmas: RmaTicketDto[] }>(`/rma/mine`)
  return data.rmas
}

export async function getRma(id: string) {
  const { data } = await api.get<{ rma: RmaTicketDto }>(`/rma/${id}`)
  return data.rma
}
