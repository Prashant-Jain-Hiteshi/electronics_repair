import { api } from './client'

export type ApprovalType = 'estimate' | 'extra_parts'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export type ApprovalRequest = {
  id: string
  repairOrderId: string
  customerId: string
  type: ApprovalType
  status: ApprovalStatus
  title?: string | null
  message?: string | null
  items?: any | null
  amountDelta?: number | null
  token?: string | null
  tokenExpiresAt?: string | null
  createdAt: string
  updatedAt: string
}

export async function createApprovalRequest(repairOrderId: string, payload: {
  type: ApprovalType
  title?: string
  message?: string
  items?: any
  amountDelta?: number
  expiresInDays?: number
}) {
  const res = await api.post<ApprovalRequest>(`/approvals/repairs/${repairOrderId}`, payload)
  return res.data
}

export async function listApprovalsForRepair(repairOrderId: string) {
  const res = await api.get<ApprovalRequest[]>(`/approvals/repairs/${repairOrderId}`)
  return res.data
}

export async function getApprovalStatus(id: string) {
  const res = await api.get<{ id: string; status: ApprovalStatus }>(`/approvals/${id}/status`)
  return res.data
}

export async function actOnApproval(id: string, action: 'approve' | 'reject') {
  const res = await api.post<ApprovalRequest>(`/approvals/${id}/act`, { action })
  return res.data
}

export async function publicActOnApproval(token: string, action: 'approve' | 'reject') {
  const res = await api.post<{ ok: boolean; id: string; status: ApprovalStatus }>(`/approvals/public/act`, { token, action })
  return res.data
}
