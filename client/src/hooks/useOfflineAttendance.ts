'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { syncManager } from '@/lib/syncManager';
import toast from 'react-hot-toast';

export interface AttendancePayload {
  studentId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  status: 'PRESENT' | 'ABSENT';
}

export function useOfflineAttendance() {
  const [loading, setLoading] = useState(false);

  const markAttendance = async (attendanceData: AttendancePayload) => {
    setLoading(true);

    const normalizedData: AttendancePayload = {
      ...attendanceData,
      date: attendanceData.date.split('T')[0],
    };

    try {
      // Probe with no-cors — avoids CORS preflight, throws only on real network failure
      const online = await fetch('http://localhost:5001/api/v1/auth/current-user', {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
      }).then(() => true).catch(() => false);

      if (online) {
        try {
          const response = await api.post('/attendance/bulk-sync', {
            records: [normalizedData],
          });
          toast.success('Attendance marked successfully');
          return response.data;
        } catch (error: any) {
          if (!error.response) {
            // Network failed mid-request — save offline
            await syncManager.markAttendanceOffline(normalizedData);
            toast.success('Saved offline. Will sync when online.');
            return { offline: true };
          }
          throw error;
        }
      } else {
        await syncManager.markAttendanceOffline(normalizedData);
        toast.success('Saved offline. Will sync when online.');
        return { offline: true };
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to mark attendance';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { markAttendance, loading };
}