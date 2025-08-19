export type RepairStatus =
  | 'new'
  | 'diagnosis'
  | 'waiting_parts'
  | 'in_progress'
  | 'completed'
  | 'delivered'
  | 'canceled'

export type RepairPriority = 'low' | 'medium' | 'high' | 'urgent'

export type RepairOrder = {
  id: string
  ticketNumber?: string
  deviceBrand?: string
  deviceModel?: string
  issueDescription?: string
  status: RepairStatus
  priority?: RepairPriority
  estimatedCost?: number | null
  actualCost?: number | null
  createdAt: string
  updatedAt: string
  dueDate?: string | null
}
