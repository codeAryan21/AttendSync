'use client';

import { useState, useEffect } from 'react';
import { syncManager, SyncStatus } from '@/lib/syncManager';
import { offlineDB } from '@/lib/offlineDB';

export default function PWATestPage() {
  const [loading] = useState(false);
  const [status, setStatus] = useState<SyncStatus>({
    online: true,
    syncing: false,
    pendingCount: 0,
  });
  const [testResults, setTestResults] = useState<string[]>([]);
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = syncManager.onStatusChange(setStatus);
    loadPendingRecords();
    return unsubscribe;
  }, []);

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const loadPendingRecords = async () => {
    try {
      const records = await offlineDB.getPendingAttendance();
      setPendingRecords(records);
      addLog(`Loaded ${records.length} pending records from IndexedDB`);
    } catch (error) {
      addLog(`Error loading records: ${error}`);
    }
  };

  const testOfflineAttendance = async () => {
    addLog('Saving test record directly to IndexedDB (offline storage test)...');
    try {
      const token = localStorage.getItem('accessToken') || 'test-token';
      const testData = {
        studentId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // placeholder
        classId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',   // placeholder
        status: 'PRESENT',
        date: new Date().toISOString().split('T')[0],       // YYYY-MM-DD
      };

      await offlineDB.addAttendance(testData, token);
      await loadPendingRecords();
      addLog('✅ Record saved to IndexedDB successfully');
      addLog('ℹ️  Note: Use real classId/studentId from your app for actual sync to work');
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  const testManualSync = async () => {
    addLog('Testing manual sync...');
    try {
      await syncManager.syncNow();
      addLog('✅ Manual sync completed');
      setTimeout(loadPendingRecords, 500);
    } catch (error: any) {
      addLog(`❌ Sync error: ${error.message}`);
    }
  };

  const clearPendingRecords = async () => {
    addLog('Clearing all pending records...');
    try {
      const records = await offlineDB.getPendingAttendance();
      for (const record of records) {
        await offlineDB.deleteAttendance(record.id);
      }
      addLog(`✅ Cleared ${records.length} records`);
      loadPendingRecords();
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  const testServiceWorker = () => {
    addLog('Checking Service Worker...');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          addLog(`✅ Service Worker registered: ${registration.scope}`);
          addLog(`   State: ${registration.active?.state || 'unknown'}`);
        } else {
          addLog('❌ Service Worker not registered');
        }
      });
    } else {
      addLog('❌ Service Worker not supported');
    }
  };

  const testIndexedDB = async () => {
    addLog('Testing IndexedDB...');
    try {
      await offlineDB.init();
      const count = await offlineDB.getCount();
      addLog(`✅ IndexedDB initialized, ${count} pending records`);
    } catch (error: any) {
      addLog(`❌ IndexedDB error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PWA Test Dashboard</h1>
          <p className="text-gray-600">Test offline attendance and sync functionality</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`p-6 rounded-lg shadow ${status.online ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${status.online ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <div>
                <p className="text-sm text-gray-600">Connection</p>
                <p className="text-xl font-bold">{status.online ? 'Online' : 'Offline'}</p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg shadow ${status.syncing ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50 border-2 border-gray-300'}`}>
            <div className="flex items-center gap-3">
              {status.syncing && (
                <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <div>
                <p className="text-sm text-gray-600">Sync Status</p>
                <p className="text-xl font-bold">{status.syncing ? 'Syncing...' : 'Idle'}</p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg shadow ${status.pendingCount > 0 ? 'bg-orange-50 border-2 border-orange-500' : 'bg-gray-50 border-2 border-gray-300'}`}>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm text-gray-600">Pending Records</p>
                <p className="text-xl font-bold">{status.pendingCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Test Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={testOfflineAttendance}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              Save Offline Record
            </button>

            <button
              onClick={testManualSync}
              disabled={status.syncing || status.pendingCount === 0}
              className="bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 transition-colors"
            >
              Manual Sync
            </button>

            <button
              onClick={testServiceWorker}
              className="bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Check SW
            </button>

            <button
              onClick={testIndexedDB}
              className="bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Test IndexedDB
            </button>

            <button
              onClick={loadPendingRecords}
              className="bg-yellow-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-yellow-700 transition-colors"
            >
              Reload Records
            </button>

            <button
              onClick={clearPendingRecords}
              className="bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Clear All
            </button>

            <button
              onClick={() => setTestResults([])}
              className="bg-gray-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Clear Logs
            </button>

            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Pending Records ({pendingRecords.length})
          </h2>
          {pendingRecords.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending records</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingRecords.map((record) => (
                <div key={record.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Record #{record.id}</p>
                      <p className="text-sm text-gray-600">Class: {record.data.classId}</p>
                      <p className="text-sm text-gray-600">Student: {record.data.studentId}</p>
                      <p className="text-sm text-gray-600">Status: {record.data.status}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(record.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        await offlineDB.deleteAttendance(record.id);
                        loadPendingRecords();
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Test Log</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">No logs yet. Run some tests!</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">{result}</div>
              ))
            )}
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">Testing Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Click "Check SW" → verify Service Worker is registered</li>
            <li>Click "Test IndexedDB" → verify database is working</li>
            <li>Click "Save Offline Record" → saves a record directly to IndexedDB</li>
            <li>Check "Pending Records" section → should show the saved record</li>
            <li>To test real sync: go to your actual attendance page, go offline (DevTools → Network → Offline), mark attendance there, then come back online</li>
            <li>Click "Manual Sync" → only works with real studentId/classId records</li>
            <li>Pending records disappear after a successful sync</li>
          </ol>
          <p className="mt-3 text-sm text-blue-700 bg-blue-100 p-2 rounded">
            ⚠️ The "Save Offline Record" button uses placeholder IDs. Real sync requires valid studentId and classId from your database.
          </p>
        </div>
      </div>
    </div>
  );
}