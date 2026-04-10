'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import Sidebar from '@/components/Sidebar';
import toast from 'react-hot-toast';
import { syncManager } from '@/lib/syncManager';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, logout, getCurrentUser } = useAuthStore();
  const { fetchSettings } = useSettingsStore();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isOnline, setIsOnline] = useState(() =>
    typeof window !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Directly listen to browser online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also subscribe to syncManager for pending/syncing state
    const unsubscribe = syncManager.onStatusChange((status) => {
      setIsOnline(status.online);
      setPendingCount(status.pendingCount);
      setSyncing(status.syncing);
    });

    // Force-read current state immediately
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      
      if (token && !user) {
        try {
          await getCurrentUser();
        } catch (error) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setIsInitializing(false);
    };
    
    initAuth();
  }, [getCurrentUser, user]);

  // Initialize settings when user is authenticated
  useEffect(() => {
    if (user && isAuthenticated) {
      fetchSettings();
    }
  }, [user, isAuthenticated, fetchSettings]);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/');
    }
  }, [isAuthenticated, isInitializing, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out successfully!');
      router.push('/');
    } catch (error) {
      toast.error('Logout failed, but you have been signed out locally');
      router.push('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isInitializing || (!isAuthenticated || !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading AttendSync...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white hover:bg-gray-600 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <Sidebar isCollapsed={false} onToggle={() => {}} />
          </div>
        </div>
      )}

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden">
          <div className="flex items-center justify-between bg-white shadow-sm border-b border-gray-200 px-4 py-3">
            <button
              className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              AttendSync
            </h1>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {isLoggingOut ? (
                <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-red-600 rounded-full"></div>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Global offline / sync banner — fixed below header, above scrollable content */}
        {(!isOnline || pendingCount > 0 || syncing) && (
          <div className={`flex-shrink-0 px-4 py-2 flex items-center justify-between text-sm font-semibold ${
            !isOnline
              ? 'bg-yellow-400 text-yellow-900'
              : syncing
              ? 'bg-blue-500 text-white'
              : 'bg-orange-500 text-white'
          }`}>
            <div className="flex items-center gap-2">
              {!isOnline && (
                <>
                  <span className="w-2 h-2 rounded-full bg-yellow-900 opacity-60 animate-pulse inline-block" />
                  <span>You are offline — attendance saves locally and syncs when you reconnect</span>
                </>
              )}
              {isOnline && syncing && (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Syncing offline attendance to server...</span>
                </>
              )}
              {isOnline && !syncing && pendingCount > 0 && (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
                  <span>{pendingCount} attendance record{pendingCount > 1 ? 's' : ''} waiting to sync</span>
                </>
              )}
            </div>
            {isOnline && !syncing && pendingCount > 0 && (
              <button
                onClick={() => syncManager.syncNow()}
                className="ml-4 px-3 py-1 bg-white text-orange-600 rounded font-semibold text-xs hover:bg-orange-50 transition-colors"
              >
                Sync now
              </button>
            )}
          </div>
        )}

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}