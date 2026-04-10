import api from './api';
import { offlineDB } from './offlineDB';

class SyncManager {
  private syncing = false;
  private isReallyOnline = true;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());

      navigator.serviceWorker?.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_SUCCESS') {
          this.updateStatus();
        }
      });

      // Poll every 2s — DevTools "Offline" throttling does NOT fire
      // window online/offline events, so we must detect it via fetch
      setInterval(() => this.checkConnectivity(), 2000);

      // Run once immediately on mount
      this.checkConnectivity();
    }
  }

  private async checkConnectivity(): Promise<void> {
    try {
      // Use no-cors so the server's CORS policy never blocks the ping.
      // With no-cors the response is opaque (we can't read it) but if
      // the fetch resolves at all it means the network is reachable.
      await fetch('http://localhost:5001/health', {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
      });
      if (!this.isReallyOnline) {
        this.isReallyOnline = true;
        this.handleOnline();
      } else {
        this.updateStatus();
      }
    } catch {
      // Only mark offline on a genuine network failure (fetch throws),
      // not on HTTP error responses.
      if (this.isReallyOnline) {
        this.isReallyOnline = false;
        this.handleOffline();
      }
    }
  }

  async markAttendanceOffline(attendanceData: any): Promise<void> {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('No auth token');

    await offlineDB.addAttendance(attendanceData, token);
    await this.updateStatus();

    if (this.isReallyOnline) {
      this.syncNow();
    } else {
      this.registerBackgroundSync();
    }
  }

  async syncNow(): Promise<void> {
    if (this.syncing) return;

    this.syncing = true;
    this.notifyListeners({ online: this.isReallyOnline, syncing: true, pendingCount: 0 });

    try {
      const pending = await offlineDB.getPendingAttendance();
      if (pending.length === 0) {
        this.syncing = false;
        this.notifyListeners({ online: this.isReallyOnline, syncing: false, pendingCount: 0 });
        return;
      }

      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
      const VALID_STATUS = ['PRESENT', 'ABSENT'];

      const validRecords: typeof pending = [];
      for (const record of pending) {
        const d = record.data;
        const normalizedDate = typeof d.date === 'string' ? d.date.split('T')[0] : '';
        const isValid =
          UUID_REGEX.test(d.studentId) &&
          UUID_REGEX.test(d.classId) &&
          DATE_REGEX.test(normalizedDate) &&
          VALID_STATUS.includes(d.status);

        if (!isValid) {
          console.warn('Removing invalid offline record:', record.id, d);
          await offlineDB.deleteAttendance(record.id);
          continue;
        }
        record.data.date = normalizedDate;
        validRecords.push(record);
      }

      if (validRecords.length === 0) {
        this.syncing = false;
        await this.updateStatus();
        return;
      }

      const byToken = new Map<string, typeof validRecords>();
      for (const record of validRecords) {
        const group = byToken.get(record.token) || [];
        group.push(record);
        byToken.set(record.token, group);
      }

      for (const [token, records] of byToken) {
        try {
          await api.post('/attendance/bulk-sync', {
            records: records.map((r) => ({
              studentId: r.data.studentId,
              classId: r.data.classId,
              date: r.data.date,
              status: r.data.status,
            })),
          }, {
            headers: { Authorization: `Bearer ${token}` },
          });

          for (const record of records) {
            await offlineDB.deleteAttendance(record.id);
          }
        } catch (error: any) {
          if (error?.response?.status === 400) {
            console.warn('Server rejected records (400), removing:', error.response?.data);
            for (const record of records) {
              await offlineDB.deleteAttendance(record.id);
            }
          } else {
            console.error('Bulk sync failed, will retry later:', error?.message);
          }
        }
      }

      const remainingCount = await offlineDB.getCount();
      this.notifyListeners({ online: this.isReallyOnline, syncing: false, pendingCount: remainingCount });
    } catch (error) {
      console.error('Sync failed:', error);
      const count = await offlineDB.getCount();
      this.notifyListeners({ online: this.isReallyOnline, syncing: false, pendingCount: count });
    } finally {
      this.syncing = false;
    }
  }

  private async handleOffline(): Promise<void> {
    this.isReallyOnline = false;
    const count = await offlineDB.getCount();
    this.notifyListeners({ online: false, syncing: false, pendingCount: count });
  }

  private async handleOnline(): Promise<void> {
    this.isReallyOnline = true;
    const count = await offlineDB.getCount();
    this.notifyListeners({ online: true, syncing: false, pendingCount: count });
    if (count > 0) {
      this.syncNow();
    }
  }

  private async updateStatus(): Promise<void> {
    const count = await offlineDB.getCount();
    this.notifyListeners({
      online: this.isReallyOnline,
      syncing: this.syncing,
      pendingCount: count,
    });
  }

  private registerBackgroundSync(): void {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        return (registration as any).sync.register('sync-attendance');
      }).catch((error) => {
        console.error('Background sync registration failed:', error);
      });
    }
  }

  async getPendingCount(): Promise<number> {
    return await offlineDB.getCount();
  }

  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.listeners.add(callback);

    // Send initial status immediately
    offlineDB.getCount().then((count) => {
      callback({
        online: this.isReallyOnline,
        syncing: this.syncing,
        pendingCount: count,
      });
    });

    return () => this.listeners.delete(callback);
  }

  private notifyListeners(status: SyncStatus): void {
    this.listeners.forEach((callback) => callback(status));
  }
}

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
}

export const syncManager = new SyncManager();