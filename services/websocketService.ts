import { apiService } from './apiService';

type MessageType = 'TEXT' | 'IMAGE' | 'ORDER' | 'SYSTEM';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: MessageType;
  imageUrl?: string;
  orderId?: string;
  createdAt: string;
  isRead: boolean;
  sender?: {
    id: string;
    email: string;
    profile?: {
      name?: string;
      avatarUrl?: string;
    };
  };
}

type MessageHandler = (message: Message) => void;
type TypingHandler = (data: { senderId: string; isTyping: boolean }) => void;
type ReadHandler = (data: { messageIds: string[]; readerId: string; readAt: string }) => void;
type UnreadCountHandler = (data: { count: number }) => void;
type ConnectionHandler = () => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Set<MessageHandler> = new Set();
  private typingHandlers: Set<TypingHandler> = new Set();
  private readHandlers: Set<ReadHandler> = new Set();
  private unreadCountHandlers: Set<UnreadCountHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private disconnectionHandlers: Set<ConnectionHandler> = new Set();
  private currentUserId: string | null = null;

  private getToken(): string | null {
    return localStorage.getItem('medimate_access_token');
  }

  private getUserId(): string | null {
    const user = apiService.getUser();
    return user?.id || null;
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = this.getToken();
    if (!token) {
      console.warn('No token available for WebSocket connection');
      return;
    }

    this.currentUserId = this.getUserId();

    // Get WebSocket URL from environment or use default
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/chat';

    this.socket = new WebSocket(`${wsUrl}?token=${token}`);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.connectionHandlers.forEach(handler => handler());
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.event) {
          case 'message:received':
            this.messageHandlers.forEach(handler => handler(data.message || data));
            break;
          case 'message:sent':
            // Message sent confirmation
            break;
          case 'typing':
            this.typingHandlers.forEach(handler => handler(data));
            break;
          case 'message:read':
            this.readHandlers.forEach(handler => handler(data));
            break;
          case 'conversation:read':
            // Conversation marked as read
            break;
          case 'unread:count':
            this.unreadCountHandlers.forEach(handler => handler(data));
            break;
          case 'user:online':
          case 'user:offline':
            // Handle presence
            break;
          case 'error':
            console.error('WebSocket error:', data.message);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.disconnectionHandlers.forEach(handler => handler());
      this.attemptReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  joinRoom(orderId: string, userId: string) {
    this.send('join:room', { orderId, userId });
  }

  leaveRoom(orderId: string) {
    this.send('leave:room', { orderId });
  }

  sendMessage(receiverId: string, content: string, orderId?: string, type: MessageType = 'TEXT', imageUrl?: string) {
    this.send('message:send', { receiverId, content, orderId, type, imageUrl });
  }

  sendTyping(receiverId: string, isTyping: boolean) {
    this.send('typing', { receiverId, isTyping });
  }

  markAsRead(messageIds: string[], senderId: string) {
    this.send('message:read', { messageIds, senderId });
  }

  markConversationAsRead(partnerId: string) {
    this.send('conversation:read', { partnerId });
  }

  private send(event: string, data: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, ...data }));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  // Event handlers
  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onTyping(handler: TypingHandler) {
    this.typingHandlers.add(handler);
    return () => this.typingHandlers.delete(handler);
  }

  onMessageRead(handler: ReadHandler) {
    this.readHandlers.add(handler);
    return () => this.readHandlers.delete(handler);
  }

  onUnreadCount(handler: UnreadCountHandler) {
    this.unreadCountHandlers.add(handler);
    return () => this.unreadCountHandlers.delete(handler);
  }

  onConnect(handler: ConnectionHandler) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler) {
    this.disconnectionHandlers.add(handler);
    return () => this.disconnectionHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }
}

export const wsService = new WebSocketService();
