import { api } from '../client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Types
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
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone?: string;
    address?: string;
  };
  token: string;
}

// API functions
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/login', credentials);
  return data;
};

export const register = async (userData: RegisterData): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/register', userData);
  return data;
};

export const getCurrentUser = async (): Promise<AuthResponse['user']> => {
  const { data } = await api.get<AuthResponse['user']>('/auth/me');
  return data;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};

// React Query hooks
export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: login,
    onSuccess: (data) => {
      // Update auth state in the store
      queryClient.setQueryData(['auth', 'user'], data.user);
      // Invalidate and refetch any queries that depend on auth state
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();
  
  return useMutation<AuthResponse, Error, RegisterData>({
    mutationFn: register,
    onSuccess: (data) => {
      // Update auth state in the store
      queryClient.setQueryData(['auth', 'user'], data.user);
      // Invalidate and refetch any queries that depend on auth state
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Clear auth state from the store
      queryClient.setQueryData(['auth', 'user'], null);
      // Invalidate and refetch any queries that depend on auth state
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      // Clear all queries
      queryClient.clear();
    },
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

// Auth utilities
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('auth_token') || !!localStorage.getItem('token');
};

export const setAuthToken = (token: string): void => {
  // Store in both locations for backward compatibility
  localStorage.setItem('auth_token', token);
  localStorage.setItem('token', token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('token');
};
