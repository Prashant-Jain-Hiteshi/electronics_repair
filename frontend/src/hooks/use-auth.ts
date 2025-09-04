import { useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'customer' | 'technician' | 'admin';
  avatar?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences?: {
    notifications: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  createdAt: string;
  updatedAt: string;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password: string }) => Promise<boolean>;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUser = useCallback(async () => {
    try {
      // In a real app, you would fetch the user from your auth provider
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      
      const mockUser: User = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '(555) 123-4567',
        role: 'customer',
        avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          country: 'USA',
        },
        preferences: {
          notifications: true,
          theme: 'system',
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setUser(mockUser);
      return mockUser;
    } catch (error) {
      console.error('Failed to fetch user', error);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchUser();
      return true;
    } catch (error) {
      console.error('Login failed', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchUser]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setUser(null);
    } catch (error) {
      console.error('Logout failed', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData: any): Promise<boolean> => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchUser();
      return true;
    } catch (error) {
      console.error('Registration failed', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchUser]);

  const updateProfile = useCallback(async (updates: Partial<User>): Promise<boolean> => {
    try {
      if (!user) return false;
      
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedUser = { ...user, ...updates, updatedAt: new Date().toISOString() };
      setUser(updatedUser);
      return true;
    } catch (error) {
      console.error('Profile update failed', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    updateProfile,
    refreshUser: fetchUser,
  };
}
