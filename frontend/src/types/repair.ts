export type RepairStatus =
  | 'new'
  | 'diagnosis'
  | 'waiting_parts'
  | 'awaiting_parts'
  | 'in_progress'
  | 'completed'
  | 'delivered'
  | 'canceled';

export type RepairPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface DeviceInfo {
  brand: string;
  model: string;
}

export interface RepairOrder {
  id: string;
  customerId: string;
  device: string | DeviceInfo;
  issue: string;
  status: RepairStatus;
  estimatedCompletion?: string;
  estimatedCost?: number;
  actualCost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  deliveredAt?: string;
  priority?: RepairPriority;
  trackingNumber?: string;
  warrantyUntil?: string;
  technicianNotes?: string[];
  customerNotes?: string[];
  parts?: RepairPart[];
  laborHours?: number;
  laborRate?: number;
  depositAmount?: number;
  balanceDue?: number;
  paymentStatus?: 'unpaid' | 'partial' | 'paid' | 'refunded';
  paymentMethod?: string;
  paymentTransactionId?: string;
  images?: string[];
  documents?: string[];
  signature?: string;
  isWarrantyClaim?: boolean;
  warrantyClaimId?: string;
  isInsuranceClaim?: boolean;
  insuranceClaimId?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceClaimStatus?: string;
  insuranceClaimAmount?: number;
  insuranceClaimNotes?: string;
  insuranceClaimApproved?: boolean;
  insuranceClaimApprovedAmount?: number;
  insuranceClaimApprovalDate?: string;
  insuranceClaimDenialReason?: string;
}

export interface RepairPart {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isInStock: boolean;
  expectedArrival?: string;
  supplier?: string;
  supplierPartNumber?: string;
  notes?: string;
}

export interface RepairStats {
  total: number;
  inProgress: number;
  completed: number;
  waitingForParts: number;
  revenue: number;
  averageRepairTime: number;
  statusDistribution: Record<RepairStatus, number>;
  monthlyTrend: Array<{
    month: string;
    count: number;
    revenue: number;
  }>;
}
