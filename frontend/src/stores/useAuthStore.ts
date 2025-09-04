import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: Omit<User, 'id' | 'role'> & { password: string }) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        
        login: async (email, password) => {
          set({ loading: true, error: null });
          try {
            // TODO: Replace with actual API call
            // const response = await api.post('/auth/login', { email, password });
            // const { user, token } = response.data;
            // set({ user, token, isAuthenticated: true, loading: false });
            
            // Mock implementation for now
            const mockUser = { id: '1', email, name: 'Test User', role: 'customer' };
            const mockToken = 'mock-jwt-token';
            set({ 
              user: mockUser, 
              token: mockToken, 
              isAuthenticated: true, 
              loading: false 
            });
          } catch (error: any) {
            set({ 
              error: error.response?.data?.message || 'Login failed', 
              loading: false 
            });
            throw error;
          }
        },
        
        register: async (userData) => {
          set({ loading: true, error: null });
          try {
            // TODO: Replace with actual API call
            // const response = await api.post('/auth/register', userData);
            // const { user, token } = response.data;
            // set({ user, token, isAuthenticated: true, loading: false });
            
            // Mock implementation for now
            const mockUser = { 
              id: '1', 
              email: userData.email, 
              name: userData.name, 
              role: 'customer' 
            };
            const mockToken = 'mock-jwt-token';
            set({ 
              user: mockUser, 
              token: mockToken, 
              isAuthenticated: true, 
              loading: false 
            });
          } catch (error: any) {
            set({ 
              error: error.response?.data?.message || 'Registration failed', 
              loading: false 
            });
            throw error;
          }
        },
        
        logout: () => {
          // TODO: Add API call to invalidate token
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false, 
            loading: false 
          });
        },
        
        setUser: (user) => set({ user }),
        
        setToken: (token) => set({ token }),
        
        clearError: () => set({ error: null }),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

// Export hooks for convenience
export const useCurrentUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAuthActions = () => {
  const { login, register, logout, setUser, setToken, clearError } = useAuthStore();
  return { login, register, logout, setUser, setToken, clearError };
};
