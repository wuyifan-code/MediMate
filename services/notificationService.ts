/**
 * Notification Service
 * Notification related API calls
 */
import { axiosInstance } from './baseApiClient';
import { ApiResponse } from '../types';

// Get notifications
export async function getNotifications(page = 1, limit = 20, unreadOnly = false, type?: string): Promise<any> {
  let url = `/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`;
  if (type) url += `&type=${type}`;

  try {
    const response = await axiosInstance.get<ApiResponse<any>>(url);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get notifications');
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return { notifications: [], unreadCount: 0, pagination: { page, limit, total: 0, totalPages: 0 } };
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const response = await axiosInstance.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    if (response.data.success && response.data.data) {
      return response.data.data.count;
    }
    return 0;
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
}

// Get notification stats
export async function getNotificationStats(): Promise<any> {
  try {
    const response = await axiosInstance.get<ApiResponse<any>>('/notifications/stats');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return { total: 0, unread: 0, byType: {} };
  } catch (error) {
    console.error('Failed to get notification stats:', error);
    return { total: 0, unread: 0, byType: {} };
  }
}

// Mark notification as read
export async function markAsRead(notificationId: string): Promise<any> {
  try {
    const response = await axiosInstance.patch<ApiResponse<any>>(`/notifications/${notificationId}/read`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to mark as read');
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

// Mark all notifications as read
export async function markAllAsRead(): Promise<any> {
  try {
    const response = await axiosInstance.patch<ApiResponse<any>>('/notifications/read-all');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to mark all as read');
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw error;
  }
}

// Delete notification
export async function deleteNotification(notificationId: string): Promise<any> {
  try {
    const response = await axiosInstance.delete<ApiResponse<any>>(`/notifications/${notificationId}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to delete notification');
  } catch (error) {
    console.error('Failed to delete notification:', error);
    throw error;
  }
}

// Delete multiple notifications
export async function deleteNotifications(notificationIds: string[]): Promise<any> {
  try {
    const response = await axiosInstance.delete<ApiResponse<any>>('/notifications/batch', {
      data: { ids: notificationIds },
    });
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to delete notifications');
  } catch (error) {
    console.error('Failed to delete notifications:', error);
    throw error;
  }
}
