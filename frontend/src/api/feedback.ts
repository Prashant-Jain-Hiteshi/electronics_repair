import { api } from './client'

export interface FeedbackDto {
  id: string
  repairOrderId: string
  customerId: string
  technicianId?: string | null
  rating: number
  comments?: string | null
  npsScore?: number | null
  notifiedLowRating: boolean
  createdAt: string
  updatedAt: string
}

export async function submitFeedback(input: { repairOrderId: string; rating: number; comments?: string; npsScore?: number }) {
  const { data } = await api.post<{ feedback: FeedbackDto }>(`/feedback`, input)
  return data.feedback
}

export async function listMyFeedback() {
  const { data } = await api.get<{ feedback: FeedbackDto[] }>(`/feedback/mine`)
  return data.feedback
}

export async function getFeedbackForRepair(repairId: string) {
  const { data } = await api.get<{ feedback: FeedbackDto[] }>(`/feedback/repairs/${repairId}`)
  return data.feedback
}
