'use client';

import { create } from 'zustand';
import api from '@/lib/api';

interface Settings {
  attendanceThreshold: number;
  instituteName: string;
  autoMarkAbsent: boolean;
  emailNotifications: boolean;
}

interface SettingsStore {
  settings: Settings | null;
  loading: boolean;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  loading: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/auth/settings');
      set({ settings: response.data.data, loading: false });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      set({ 
        settings: { 
          attendanceThreshold: 75, 
          instituteName: 'AttendSync Institute',
          autoMarkAbsent: false,
          emailNotifications: true
        }, 
        loading: false 
      });
    }
  }
}));