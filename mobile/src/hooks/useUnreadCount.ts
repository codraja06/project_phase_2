import { useState, useEffect, useCallback } from 'react';
import { managementApi } from '../api/managementApi';
import { useAuth } from './useAuth';

// Global shared state for unread notification count so all UI components remain in sync
let globalUnreadCount = 0;
const listeners = new Set<(count: number) => void>();

export const notifyUnreadCountChanged = (newCount: number) => {
  globalUnreadCount = Math.max(0, newCount);
  listeners.forEach(listener => listener(globalUnreadCount));
};

export const useUnreadCount = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(globalUnreadCount);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const data = await managementApi.getNotifications(1);
      if (typeof data?.unread === 'number') {
        notifyUnreadCountChanged(data.unread);
      }
    } catch {
      // Graceful fallback: silently ignore network errors during background badge refresh
    }
  }, [user]);

  useEffect(() => {
    // Register listener for shared count updates
    const listener = (count: number) => setUnreadCount(count);
    listeners.add(listener);

    // Initial fetch
    fetchUnread();

    // Poll periodically every 45 seconds while active
    const timer = setInterval(fetchUnread, 45000);

    return () => {
      listeners.delete(listener);
      clearInterval(timer);
    };
  }, [fetchUnread]);

  return {
    unreadCount,
    refreshUnread: fetchUnread,
    setUnreadCount: notifyUnreadCountChanged,
  };
};
