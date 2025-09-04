import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { RepairOrder, RepairStatus } from '@/types';

interface RepairState {
  // State
  repairs: RepairOrder[];
  selectedRepair: RepairOrder | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchRepairs: () => Promise<void>;
  fetchRepairById: (id: string) => Promise<void>;
  createRepair: (repairData: Omit<RepairOrder, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<RepairOrder>;
  updateRepair: (id: string, updates: Partial<RepairOrder>) => Promise<void>;
  updateRepairStatus: (id: string, status: RepairStatus, notes?: string) => Promise<void>;
  deleteRepair: (id: string) => Promise<void>;
  setSelectedRepair: (repair: RepairOrder | null) => void;
  clearError: () => void;
}

export const useRepairStore = create<RepairState>()(
  devtools(
    (set, get) => ({
      // Initial state
      repairs: [],
      selectedRepair: null,
      loading: false,
      error: null,
      
      // Actions
      fetchRepairs: async () => {
        set({ loading: true, error: null });
        try {
          // TODO: Replace with actual API call
          // const response = await api.get('/repairs');
          // set({ repairs: response.data, loading: false });
          
          // Mock implementation for now
          const mockRepairs: RepairOrder[] = [
            {
              id: '1',
              deviceType: 'Smartphone',
              brand: 'Apple',
              model: 'iPhone 13',
              issueDescription: 'Screen replacement needed',
              status: 'pending',
              customerId: '1',
              technicianId: null,
              estimatedCost: 199.99,
              estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              notes: 'Customer reported cracked screen after drop',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];
          
          set({ repairs: mockRepairs, loading: false });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Failed to fetch repairs', 
            loading: false 
          });
          throw error;
        }
      },
      
      fetchRepairById: async (id) => {
        set({ loading: true, error: null });
        try {
          // TODO: Replace with actual API call
          // const response = await api.get(`/repairs/${id}`);
          // set({ selectedRepair: response.data, loading: false });
          
          // Mock implementation for now
          const mockRepair: RepairOrder = {
            id,
            deviceType: 'Smartphone',
            brand: 'Apple',
            model: 'iPhone 13',
            issueDescription: 'Screen replacement needed',
            status: 'pending',
            customerId: '1',
            technicianId: null,
            estimatedCost: 199.99,
            estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            notes: 'Customer reported cracked screen after drop',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set({ selectedRepair: mockRepair, loading: false });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Failed to fetch repair details', 
            loading: false 
          });
          throw error;
        }
      },
      
      createRepair: async (repairData) => {
        set({ loading: true, error: null });
        try {
          // TODO: Replace with actual API call
          // const response = await api.post('/repairs', repairData);
          // const newRepair = response.data;
          // set((state) => ({
          //   repairs: [newRepair, ...state.repairs],
          //   loading: false,
          // }));
          // return newRepair;
          
          // Mock implementation for now
          const newRepair: RepairOrder = {
            ...repairData,
            id: Math.random().toString(36).substr(2, 9),
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set((state) => ({
            repairs: [newRepair, ...state.repairs],
            loading: false,
          }));
          
          return newRepair;
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Failed to create repair', 
            loading: false 
          });
          throw error;
        }
      },
      
      updateRepair: async (id, updates) => {
        set({ loading: true, error: null });
        try {
          // TODO: Replace with actual API call
          // await api.patch(`/repairs/${id}`, updates);
          
          set((state) => ({
            repairs: state.repairs.map((repair) =>
              repair.id === id ? { ...repair, ...updates, updatedAt: new Date().toISOString() } : repair
            ),
            selectedRepair:
              state.selectedRepair?.id === id
                ? { ...state.selectedRepair, ...updates, updatedAt: new Date().toISOString() }
                : state.selectedRepair,
            loading: false,
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Failed to update repair', 
            loading: false 
          });
          throw error;
        }
      },
      
      updateRepairStatus: async (id, status, notes) => {
        return get().updateRepair(id, { 
          status, 
          notes: notes ? `${new Date().toLocaleString()}: ${notes}\n${get().selectedRepair?.notes || ''}` : undefined,
          updatedAt: new Date().toISOString(),
        });
      },
      
      deleteRepair: async (id) => {
        set({ loading: true, error: null });
        try {
          // TODO: Replace with actual API call
          // await api.delete(`/repairs/${id}`);
          
          set((state) => ({
            repairs: state.repairs.filter((repair) => repair.id !== id),
            selectedRepair:
              state.selectedRepair?.id === id ? null : state.selectedRepair,
            loading: false,
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Failed to delete repair', 
            loading: false 
          });
          throw error;
        }
      },
      
      setSelectedRepair: (repair) => set({ selectedRepair: repair }),
      
      clearError: () => set({ error: null }),
    }),
    {
      name: 'repair-store',
    }
  )
);

// Export hooks for convenience
export const useRepairs = () => useRepairStore((state) => state.repairs);
export const useSelectedRepair = () => useRepairStore((state) => state.selectedRepair);
export const useRepairLoading = () => useRepairStore((state) => state.loading);
export const useRepairError = () => useRepairStore((state) => state.error);
export const useRepairActions = () => {
  const { 
    fetchRepairs, 
    fetchRepairById, 
    createRepair, 
    updateRepair, 
    updateRepairStatus, 
    deleteRepair, 
    setSelectedRepair, 
    clearError 
  } = useRepairStore();
  
  return { 
    fetchRepairs, 
    fetchRepairById, 
    createRepair, 
    updateRepair, 
    updateRepairStatus, 
    deleteRepair, 
    setSelectedRepair, 
    clearError 
  };
};
