const DB_NAME = 'AttendSyncDB';
const DB_VERSION = 4;
const STORE_NAME = 'pendingAttendance';

class OfflineDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        // Close any other open connections so the upgrade can proceed
        if (this.db) this.db.close();
      };
      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
        };
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        
        const store = db.createObjectStore(STORE_NAME, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      };
    });
  }

  async addAttendance(data: any, token: string): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const record = {
        data,
        token,
        timestamp: Date.now(),
        synced: 0,
      };

      const request = store.add(record);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingAttendance(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      
      // Get all records and filter manually
      const request = store.getAll();
      request.onsuccess = () => {
        const allRecords = request.result;
        const pending = allRecords.filter((record: any) => record.synced === 0);
        resolve(pending);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAttendance(id: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async markAsSynced(id: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.synced = 1;
          const updateRequest = store.put(record);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async clearSynced(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      // Get all records and delete synced ones
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        const allRecords = getAllRequest.result;
        const syncedRecords = allRecords.filter((record: any) => record.synced === 1);
        
        let deleteCount = 0;
        syncedRecords.forEach((record: any) => {
          const deleteRequest = store.delete(record.id);
          deleteRequest.onsuccess = () => {
            deleteCount++;
            if (deleteCount === syncedRecords.length) {
              resolve();
            }
          };
          deleteRequest.onerror = () => reject(deleteRequest.error);
        });
        
        if (syncedRecords.length === 0) {
          resolve();
        }
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  }

  async getCount(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      
      // Get all records and count manually
      const request = store.getAll();
      request.onsuccess = () => {
        const allRecords = request.result;
        const count = allRecords.filter((record: any) => record.synced === 0).length;
        resolve(count);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineDB = new OfflineDB();