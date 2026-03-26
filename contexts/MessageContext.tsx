import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { wsService } from '../services/websocketService';

interface MessageContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Show browser notification
  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (notificationPermission === 'granted' && document.hidden) {
      try {
        new Notification(title, {
          icon: '/icon.png',
          badge: '/icon.png',
          tag: 'medimate-message',
          ...options,
        });
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  }, [notificationPermission]);

  // Fetch unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!apiService.isLoggedIn()) return;

    try {
      const count = await apiService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  // Initial load and WebSocket setup
  useEffect(() => {
    if (apiService.isLoggedIn()) {
      const refreshTimeout = window.setTimeout(() => {
        void refreshUnreadCount();
      }, 0);

      // Connect WebSocket
      wsService.connect();

      // Listen for unread count updates
      const unsubscribeUnread = wsService.onUnreadCount((data) => {
        setUnreadCount(data.count);
      });

      // Listen for new messages
      const unsubscribeMessage = wsService.onMessage((message) => {
        // Update unread count
        refreshUnreadCount();

        // Show browser notification if tab is not visible
        if (document.hidden && message.sender) {
          const senderName = message.sender.profile?.name || message.sender.email;
          showNotification(senderName, {
            body: message.type === 'IMAGE' ? 'Sent an image' : message.content,
            tag: `message-${message.id}`,
          });
        }
      });

      // Poll for unread count every 30 seconds as fallback
      const interval = setInterval(refreshUnreadCount, 30000);

      // Request notification permission on first load
      let permissionTimeout: number | undefined;
      if (notificationPermission === 'default') {
        permissionTimeout = window.setTimeout(() => {
          void requestNotificationPermission();
        }, 0);
      }

      return () => {
        clearTimeout(refreshTimeout);
        if (permissionTimeout !== undefined) {
          clearTimeout(permissionTimeout);
        }
        unsubscribeUnread();
        unsubscribeMessage();
        clearInterval(interval);
      };
    }
  }, [refreshUnreadCount, showNotification, requestNotificationPermission, notificationPermission]);

  // Listen for visibility change to refresh count when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshUnreadCount]);

  return (
    <MessageContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        requestNotificationPermission,
        showNotification,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = (): MessageContextType => {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};

export default MessageContext;
