/**
 * Message Service
 * Message and conversation related API calls
 */
import { axiosInstance } from './baseApiClient';
import { ApiResponse } from '../types';

// Get conversations list
export async function getConversations(): Promise<any[]> {
  const response = await axiosInstance.get<ApiResponse<any[]>>('/messages/conversations');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return [];
}

// Start or get existing conversation with a user
export async function startConversation(userId: string): Promise<any> {
  const response = await axiosInstance.post<ApiResponse<any>>('/messages/conversations', { userId });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to start conversation');
}

// Get unread message count
export async function getUnreadCount(): Promise<number> {
  const response = await axiosInstance.get<ApiResponse<{ count: number }>>('/messages/unread-count');
  if (response.data.success && response.data.data) {
    return response.data.data.count;
  }
  return 0;
}

// Get conversation messages with a partner
export async function getMessages(partnerId: string, page = 1, limit = 50): Promise<any[]> {
  const response = await axiosInstance.get<ApiResponse<any[]>>(`/messages/${partnerId}?page=${page}&limit=${limit}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return [];
}

// Send a message via HTTP (fallback when WebSocket is not available)
export async function sendMessage(data: {
  receiverId: string;
  content: string;
  orderId?: string;
  type?: string;
  imageUrl?: string;
}): Promise<any> {
  const response = await axiosInstance.post<ApiResponse<any>>('/messages', data);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to send message');
}

// Search messages
export async function searchMessages(query: string): Promise<any[]> {
  const response = await axiosInstance.get<ApiResponse<any[]>>(`/messages/search?q=${encodeURIComponent(query)}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return [];
}

// Mark message as read
export async function markMessageRead(messageId: string): Promise<any> {
  const response = await axiosInstance.patch<ApiResponse<any>>(`/messages/${messageId}/read`);
  if (response.data.success) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to mark message as read');
}

// Mark conversation as read
export async function markConversationRead(partnerId: string): Promise<any> {
  const response = await axiosInstance.patch<ApiResponse<any>>(`/messages/conversations/${partnerId}/read`);
  if (response.data.success) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to mark conversation as read');
}

// Delete a message
export async function deleteMessage(messageId: string): Promise<any> {
  const response = await axiosInstance.delete<ApiResponse<any>>(`/messages/${messageId}`);
  if (response.data.success) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to delete message');
}
