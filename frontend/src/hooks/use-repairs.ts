import { useState, useEffect, useCallback } from 'react';
import { RepairOrder, RepairStatus } from '@/types/repair';

interface UseRepairsReturn {
  repairs: RepairOrder[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getRepair: (id: string) => RepairOrder | undefined;
  updateRepair: (id: string, updates: Partial<RepairOrder>) => void;
}

export function useRepairs(userId?: string): UseRepairsReturn {
  const [repairs, setRepairs] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRepairs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real app, you would fetch repairs from your API
      // const response = await fetch(`/api/repairs?userId=${userId}`);
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockRepairs: RepairOrder[] = [
        {
          id: '1',
          customerId: '1',
          device: 'iPhone 13 Pro',
          issue: 'Broken screen',
          status: 'in_progress' as RepairStatus,
          estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedCost: 199.99,
          actualCost: 199.99,
          priority: 'high',
          paymentStatus: 'unpaid',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          parts: [
            {
              id: 'p1',
              name: 'iPhone 13 Pro OLED Screen',
              partNumber: 'APP-IP13P-OLED',
              quantity: 1,
              unitPrice: 149.99,
              totalPrice: 149.99,
              isInStock: true,
            },
          ],
          laborHours: 1,
          laborRate: 50,
        },
        {
          id: '2',
          customerId: '1',
          device: 'Samsung Galaxy S21',
          issue: 'Battery replacement',
          status: 'completed' as RepairStatus,
          estimatedCompletion: new Date().toISOString(),
          estimatedCost: 99.99,
          actualCost: 99.99,
          priority: 'medium',
          paymentStatus: 'paid',
          completedAt: new Date().toISOString(),
          deliveredAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      setRepairs(mockRepairs);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch repairs'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const getRepair = useCallback((id: string) => {
    return repairs.find(repair => repair.id === id);
  }, [repairs]);

  const updateRepair = useCallback((id: string, updates: Partial<RepairOrder>) => {
    setRepairs(prevRepairs => 
      prevRepairs.map(repair => 
        repair.id === id 
          ? { ...repair, ...updates, updatedAt: new Date().toISOString() } 
          : repair
      )
    );
  }, []);

  useEffect(() => {
    fetchRepairs();
  }, [fetchRepairs]);

  return {
    repairs,
    loading,
    error,
    refresh: fetchRepairs,
    getRepair,
    updateRepair,
  };
}
