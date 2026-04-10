'use client';

import { useEffect, useState } from 'react';
import { syncManager, SyncStatus } from '@/lib/syncManager';

export default function OfflineIndicator() {
  const [status, setStatus] = useState<SyncStatus>({
    online: true,
    syncing: false,
    pendingCount: 0,
  });

  useEffect(() => {
    const unsubscribe = syncManager.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  if (status.online && status.pendingCount === 0 && !status.syncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!status.online && (
        <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <span className="font-medium">Offline Mode</span>
        </div>
      )}

      {status.syncing && (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 mt-2">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-medium">Syncing...</span>
        </div>
      )}

      {status.pendingCount > 0 && !status.syncing && (
        <div className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 mt-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{status.pendingCount} pending</span>
          {status.online && (
            <button
              onClick={() => syncManager.syncNow()}
              className="ml-2 text-xs underline hover:no-underline"
            >
              Sync now
            </button>
          )}
        </div>
      )}
    </div>
  );
}