import { api } from '../client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RepairOrder, RepairStatus } from '@/types';

// Types
export interface CreateRepairData {
  deviceType: string;
  brand: string;
  model: string;
  issueDescription: string;
  customerNotes?: string;
  estimatedCost?: number;
  estimatedCompletion?: string;
}

export interface UpdateRepairData extends Partial<CreateRepairData> {
  status?: RepairStatus;
  technicianNotes?: string;
  actualCost?: number;
  completedAt?: string | null;
}

// API functions
export const fetchRepairs = async (): Promise<RepairOrder[]> => {
  const { data } = await api.get<RepairOrder[]>('/repairs');
  return data;
};

export const fetchRepairById = async (id: string): Promise<RepairOrder> => {
  const { data } = await api.get<RepairOrder>(`/repairs/${id}`);
  return data;
};

export const createRepair = async (repairData: CreateRepairData): Promise<RepairOrder> => {
  const { data } = await api.post<RepairOrder>('/repairs', repairData);
  return data;
};

export const updateRepair = async (id: string, updates: UpdateRepairData): Promise<RepairOrder> => {
  const { data } = await api.patch<RepairOrder>(`/repairs/${id}`, updates);
  return data;
};

export const updateRepairStatus = async (
  id: string, 
  status: RepairStatus, 
  notes?: string
): Promise<RepairOrder> => {
  const { data } = await api.patch<RepairOrder>(`/repairs/${id}/status`, { status, notes });
  return data;
};

export const deleteRepair = async (id: string): Promise<void> => {
  await api.delete(`/repairs/${id}`);
};

// React Query hooks
export const useRepairs = (filters = {}) => {
  return useQuery<RepairOrder[], Error>({
    queryKey: ['repairs', filters],
    queryFn: fetchRepairs,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useRepair = (id: string) => {
  return useQuery<RepairOrder, Error>({
    queryKey: ['repairs', id],
    queryFn: () => fetchRepairById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCreateRepair = () => {
  const queryClient = useQueryClient();
  
  return useMutation<RepairOrder, Error, CreateRepairData>({
    mutationFn: createRepair,
    onSuccess: (newRepair) => {
      // Update the repairs list with the new repair
      queryClient.setQueryData<RepairOrder[]>(['repairs'], (old = []) => [newRepair, ...old]);
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['repairs'] });
    },
  });
};

export const useUpdateRepair = () => {
  const queryClient = useQueryClient();
  
  return useMutation<RepairOrder, Error, { id: string; updates: UpdateRepairData }>({
    mutationFn: ({ id, updates }) => updateRepair(id, updates),
    onSuccess: (updatedRepair) => {
      // Update the specific repair in the cache
      queryClient.setQueryData(['repairs', updatedRepair.id], updatedRepair);
      // Update the repairs list
      queryClient.setQueryData<RepairOrder[]>(['repairs'], (old = []) =>
        old.map(repair => repair.id === updatedRepair.id ? updatedRepair : repair)
      );
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['repairs'] });
    },
  });
};

export const useUpdateRepairStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation<RepairOrder, Error, { id: string; status: RepairStatus; notes?: string }>({
    mutationFn: ({ id, status, notes }) => updateRepairStatus(id, status, notes),
    onSuccess: (updatedRepair) => {
      // Update the specific repair in the cache
      queryClient.setQueryData(['repairs', updatedRepair.id], updatedRepair);
      // Update the repairs list
      queryClient.setQueryData<RepairOrder[]>(['repairs'], (old = []) =>
        old.map(repair => repair.id === updatedRepair.id ? updatedRepair : repair)
      );
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['repairs'] });
    },
  });
};

export const useDeleteRepair = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: deleteRepair,
    onSuccess: (_, id) => {
      // Remove the repair from the cache
      queryClient.setQueryData<RepairOrder[]>(['repairs'], (old = []) =>
        old.filter(repair => repair.id !== id)
      );
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['repairs'] });
    },
  });
};
