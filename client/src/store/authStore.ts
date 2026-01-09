import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  address?: string;
  employeeId?: string;
  isActive: boolean;
  createdAt: string;
  
  // Department info
  department?: {
    id: string;
    name: string;
    code: string;
  };
  
  // Role-specific profiles
  adminProfile?: {
    designation: string;
    permissions: string[];
  };
  
  teacherProfile?: {
    designation?: string;
    qualification?: string;
    experience?: number;
    specialization?: string;
  };
  
  studentProfile?: {
    id: string;
    rollNo: string;
    parentName?: string;
    parentPhone?: string;
    parentEmail?: string;
    feeStatus: 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED';
    batch: {
      id: string;
      name: string;
      code: string;
      year: number;
    };
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  getCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, token } = response.data.data;
          
          localStorage.setItem('accessToken', token.accessToken);
          localStorage.setItem('refreshToken', token.refreshToken);
          
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          // Continue with logout even if API call fails
        } finally {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({ user: null, isAuthenticated: false });
        }
      },

      getCurrentUser: async () => {
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }
        
        try {
          const response = await api.get('/auth/current-user');
          const user = response.data.data;
          set({ user, isAuthenticated: true });
        } catch (error) {
          set({ user: null, isAuthenticated: false });
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
      onRehydrateStorage: () => (state) => {
        const token = localStorage.getItem('accessToken');
        if (token && state) {
          state.isAuthenticated = true;
          state.getCurrentUser();
        } else if (state) {
          state.isAuthenticated = false;
          state.user = null;
        }
      },
    }
  )
);