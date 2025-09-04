import { useState, useEffect } from 'react';
import { RepairOrder } from '@/types/repair';

export function useRepairs() {
  const [repairs, setRepairs] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepairs = async () => {
      try {
        // Replace with actual API call
        const mockRepairs: RepairOrder[] = [
          {
            id: '1',
            status: 'in_progress',
            deviceBrand: 'Apple',
            deviceModel: 'iPhone 13',
            ticketNumber: 'TKT-001',
            issueDescription: 'Screen replacement',
            priority: 'high',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            estimatedCost: 199.99,
            actualCost: 199.99,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          // Add more mock repairs as needed
        ];
        
        setRepairs(mockRepairs);
      } catch (err) {
        setError('Failed to fetch repairs');
        console.error('Error fetching repairs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepairs();
  }, []);

  return { repairs, loading, error };
}
