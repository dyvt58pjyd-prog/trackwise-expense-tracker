import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  syncWithNeonServer,
  testNeonServerConnection,
  getSyncServerUrl,
  saveSyncServerUrl,
} from '../services/neonSync';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

interface SyncContextType {
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  serverUrl: string;
  errorMessage: string | null;
  triggerSync: () => Promise<void>;
  updateServerUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
  testConnection: (url?: string) => Promise<{ success: boolean; connected?: boolean; engine?: string; error?: string }>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [serverUrl, setServerUrlState] = useState<string>(getSyncServerUrl());
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem('trackwise_last_synced_at');
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSyncingRef = useRef<boolean>(false);

  const triggerSync = useCallback(async () => {
    if (!user || !user.id || !user.username) {
      setSyncStatus('idle');
      return;
    }

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      setSyncStatus('syncing');
      setErrorMessage(null);

      await syncWithNeonServer(user);

      const displayTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncedAt(displayTime);
      localStorage.setItem('trackwise_last_synced_at', displayTime);
      setSyncStatus('synced');
    } catch (err: any) {
      console.warn('Neon sync issue:', err.message);
      const isNetError =
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Cannot reach') ||
        (typeof navigator !== 'undefined' && !navigator.onLine);
      setSyncStatus(isNetError ? 'offline' : 'error');
      setErrorMessage(err.message || 'Sync failed.');
    } finally {
      isSyncingRef.current = false;
    }
  }, [user]);

  // Initial sync & periodic background sync (every 60s)
  useEffect(() => {
    if (user) {
      triggerSync();
    }

    const handleOnline = () => {
      if (user) triggerSync();
    };

    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic sync
    const interval = setInterval(() => {
      if (user && !isSyncingRef.current) {
        triggerSync();
      }
    }, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [user, triggerSync]);

  const updateServerUrl = async (newUrl: string) => {
    saveSyncServerUrl(newUrl);
    setServerUrlState(newUrl);
    const testRes = await testNeonServerConnection(newUrl);
    if (testRes.success && user) {
      await triggerSync();
    }
    return testRes;
  };

  const testConnection = async (testUrl?: string) => {
    return await testNeonServerConnection(testUrl !== undefined ? testUrl : serverUrl);
  };

  return (
    <SyncContext.Provider
      value={{
        syncStatus,
        lastSyncedAt,
        serverUrl,
        errorMessage,
        triggerSync,
        updateServerUrl,
        testConnection,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
