import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/apiService';

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  is_read?: boolean;
  data?: any;
  createdAt: string;
  created_at?: string;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export function useNotifications(pollInterval = 30000): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiService.getNotifications(1, 20, false);
      const notifs = data?.notifications || data?.data?.notifications || [];
      
      // 标准化数据
      const normalized = notifs.map((n: any) => ({
        ...n,
        isRead: n.isRead ?? n.is_read ?? false,
        createdAt: n.createdAt || n.created_at || new Date().toISOString(),
      }));
      
      setNotifications(normalized);
      setUnreadCount(normalized.filter((n: Notification) => !n.isRead).length);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('获取通知失败');
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await apiService.getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchNotifications();
    await fetchUnreadCount();
    setLoading(false);
  }, [fetchNotifications, fetchUnreadCount]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiService.markNotificationAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiService.markAllNotificationsAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await apiService.deleteNotification(id);
      const wasUnread = notifications.find(n => n.id === id && !n.isRead);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }, [notifications]);

  useEffect(() => {
    // 初始加载
    const initialRefreshTimeout = window.setTimeout(() => {
      void refresh();
    }, 0);

    // 设置轮询
    if (pollInterval > 0) {
      intervalRef.current = setInterval(() => {
        void fetchUnreadCount();
      }, pollInterval);
    }

    return () => {
      clearTimeout(initialRefreshTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refresh, fetchUnreadCount, pollInterval]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

// 播放通知声音
export function playNotificationSound() {
  const preferences = localStorage.getItem('notification_preferences');
  if (preferences) {
    const settings = JSON.parse(preferences);
    if (!settings.soundEnabled) return;
  }

  // 创建简单的提示音
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}

// 显示浏览器通知
export async function showBrowserNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) return;

  const permission = Notification.permission;
  if (permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // 播放声音
    playNotificationSound();
  } catch (error) {
    console.error('Failed to show browser notification:', error);
  }
}
