import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { managementApi } from '../api/managementApi';
import { getActiveBaseUrl } from '../api/axiosClient';
import { storageService } from '../services/storage';
import { useAuth } from './useAuth';

let globalUnreadCount = 0;
const listeners = new Set<(count: number) => void>();
const liveListeners = new Set<() => void>();
export const subscribeNotificationChanges = (listener: () => void) => {
  liveListeners.add(listener); return () => { liveListeners.delete(listener); };
};
export const notifyUnreadCountChanged = (count: number) => {
  globalUnreadCount = Math.max(0, count); listeners.forEach(listener => listener(globalUnreadCount));
};
type Hub = { userId: string; consumers: number; refresh: () => Promise<void>; stop: () => void };
let hub: Hub | undefined;

function startHub(userId: string): Hub {
  let disposed = false, delay = 1000;
  let socket: WebSocket | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | undefined;
  let refreshAgain = false;
  const refresh = (): Promise<void> => {
    if (disposed) return Promise.resolve();
    if (inFlight) { refreshAgain = true; return inFlight; }
    inFlight = managementApi.getNotifications(1).then(data => {
      if (!disposed && typeof data.unread === 'number') notifyUnreadCountChanged(data.unread);
    }).catch(() => { /* Stored events remain available for foreground/manual refresh. */ }).finally(() => {
      inFlight = undefined;
      if (refreshAgain && !disposed) { refreshAgain = false; scheduleRefresh(); }
    });
    return inFlight;
  };
  const scheduleRefresh = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      if (disposed) return;
      void refresh(); liveListeners.forEach(listener => listener());
    }, 200);
  };
  const connect = async () => {
    if (disposed) return;
    try {
      const [base, token] = await Promise.all([getActiveBaseUrl(), storageService.getToken()]);
      if (disposed || !token) return;
      const connection = new WebSocket(base.replace(/^http/, 'ws').replace(/\/$/, '') + '/notifications/live');
      socket = connection;
      connection.onopen = () => connection.send(JSON.stringify({ type: 'authenticate', token }));
      connection.onmessage = () => { delay = 1000; scheduleRefresh(); };
      connection.onerror = () => connection.close();
      connection.onclose = () => {
        if (!disposed) { retry = setTimeout(connect, delay); delay = Math.min(delay * 2, 30000); }
      };
    } catch { if (!disposed) retry = setTimeout(connect, 30000); }
  };
  const subscription = AppState.addEventListener('change', state => { if (state === 'active') scheduleRefresh(); });
  void refresh(); void connect();
  return { userId, consumers: 0, refresh, stop: () => {
    disposed = true; if (retry) clearTimeout(retry); if (debounce) clearTimeout(debounce);
    socket?.close(); subscription.remove();
  } };
}

export const useUnreadCount = () => {
  const { user } = useAuth();
  const userId = user?._id;
  const [unreadCount, setUnreadCount] = useState(globalUnreadCount);
  const refreshUnread = useCallback(async () => {
    if (hub && hub.userId === userId) await hub.refresh();
  }, [userId]);
  useEffect(() => {
    listeners.add(setUnreadCount);
    if (userId && hub?.userId !== userId) {
      hub?.stop(); notifyUnreadCountChanged(0); hub = startHub(userId);
    } else if (!userId && hub) {
      hub.stop(); hub = undefined; notifyUnreadCountChanged(0);
    }
    const current = hub;
    if (current && userId) current.consumers++;
    return () => {
      listeners.delete(setUnreadCount);
      if (current && userId && --current.consumers === 0 && hub === current) {
        current.stop(); hub = undefined;
      }
    };
  }, [userId]);
  return { unreadCount, refreshUnread, setUnreadCount: notifyUnreadCountChanged };
};
