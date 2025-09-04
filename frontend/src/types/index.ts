// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'technician' | 'customer';

// Repair Order Types
export interface RepairOrder {
  id: string;
  deviceType: string;
  brand: string;
  model: string;
  issueDescription: string;
  customerNotes?: string;
  technicianNotes?: string;
  status: RepairStatus;
  customerId: string;
  technicianId: string | null;
  estimatedCost?: number;
  actualCost?: number;
  estimatedCompletion?: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations (expanded in some API responses)
  customer?: User;
  technician?: User | null;
}

export type RepairStatus = 
  | 'pending'
  | 'diagnosing'
  | 'waiting_for_approval'
  | 'in_progress'
  | 'waiting_for_parts'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// Form Error Types
export interface FieldError {
  message: string;
  type: string;
}

export interface FormErrors {
  [key: string]: FieldError;
}

// UI Types
export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

// Pagination Types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    currentPage: number;
    perPage: number;
    totalPages: number;
  };
}

// Filter Types
export interface RepairFilter {
  status?: RepairStatus | RepairStatus[];
  customerId?: string;
  technicianId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

// Component Props
export interface ProtectedRouteProps {
  roles?: UserRole[];
  children: React.ReactNode;
}

export interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}
