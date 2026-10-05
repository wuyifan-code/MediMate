/**
 * Base API Client
 * Shared axios instance with interceptors for all services
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types';

// Storage keys
const TOKEN_KEY = 'medimate_access_token';
const REFRESH_TOKEN_KEY = 'medimate_refresh_token';
const USER_KEY = 'medimate_user';

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api'),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management functions
export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const setRefreshToken = (token: string): void => localStorage.setItem(REFRESH_TOKEN_KEY, token);
export const setUser = (user: any): void => localStorage.setItem(USER_KEY, JSON.stringify(user));

export const getStoredUser = (): any | null => {
  try {
    const userJson = localStorage.getItem(USER_KEY);
    if (!userJson) return null;
    const user = JSON.parse(userJson);
    if (user && user.role) return user;
    localStorage.removeItem(USER_KEY);
    return null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const clearAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Request interceptor - add auth token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => Promise.reject(error)
);

// Response interceptor - handle errors and token refresh
axiosInstance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>): AxiosResponse<ApiResponse> => response,
  async (error: AxiosError<ApiResponse>): Promise<any> => {
    const originalRequest = error.config;

    // Handle 401 - attempt token refresh
    if (error.response?.status === 401 && originalRequest) {
      const refreshed = await refreshToken();
      if (refreshed) {
        return axiosInstance.request(originalRequest);
      }
      clearAuth();
    }

    return Promise.reject(error);
  }
);

// Refresh token
async function refreshToken(): Promise<boolean> {
  const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshTokenValue) return false;

  try {
    const response = await axiosInstance.post<ApiResponse<{ accessToken: string; refreshToken: string; user: any }>>('/auth/refresh', {
      refreshToken: refreshTokenValue,
    });

    if (response.data.success && response.data.data) {
      setToken(response.data.data.accessToken);
      setRefreshToken(response.data.data.refreshToken);
      setUser(response.data.data.user);
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }
  return false;
}

// Mock data for fallback when backend is unavailable
function getMockData(url: string): any {
  if (url.includes('/hospitals')) {
    return [
      { id: '1', name: '北京协和医院', department: '内科', level: '三甲', address: '北京市东城区帅府园1号', phone: '010-69156114', rating: 4.8, imageUrl: 'https://picsum.photos/400/200?random=1' },
      { id: '2', name: '复旦大学附属华山医院', department: '外科', level: '三甲', address: '上海市静安区乌鲁木齐中路12号', phone: '021-52889999', rating: 4.7, imageUrl: 'https://picsum.photos/400/200?random=2' },
      { id: '3', name: '中山大学附属第一医院', department: '儿科', level: '三甲', address: '广州市中山二路58号', phone: '020-87755766', rating: 4.9, imageUrl: 'https://picsum.photos/400/200?random=3' },
    ];
  } else if (url.includes('/escorts')) {
    return [
      { id: '1', userId: 'user1', rating: 4.9, completedOrders: 156, isVerified: true, specialties: ['儿科', '骨科'], bio: '有5年陪诊经验', hourlyRate: 150, user: { id: 'user1', name: '王淑芬', avatarUrl: 'https://picsum.photos/100/100?random=20' } },
      { id: '2', userId: 'user2', rating: 4.8, completedOrders: 89, isVerified: true, specialties: ['内科', '妇科'], bio: '专业医疗背景', hourlyRate: 120, user: { id: 'user2', name: '张伟', avatarUrl: 'https://picsum.photos/100/100?random=21' } },
    ];
  } else if (url.includes('/services/recommended')) {
    return [
      { id: '1', name: '全程陪诊', description: '从挂号到取药的全程陪伴', basePrice: 300, type: 'FULL_PROCESS' },
      { id: '2', name: '代约挂号', description: '帮助预约专家号', basePrice: 100, type: 'APPOINTMENT' },
      { id: '3', name: '代取报告', description: '代取检查报告并解读', basePrice: 80, type: 'REPORT_PICKUP' },
      { id: '4', name: '专车接送', description: '舒适专车接送服务', basePrice: 200, type: 'VIP_TRANSPORT' },
    ];
  } else if (url.includes('/auth/login') || url.includes('/auth/register')) {
    return { accessToken: 'mock-token-123', refreshToken: 'mock-refresh-token-456', user: { id: 'user-123', email: 'test@example.com', role: 'PATIENT' } };
  } else if (url.includes('/orders')) {
    return [];
  } else if (url.includes('/notifications')) {
    return { data: [], total: 0, page: 1, limit: 20 };
  } else if (url.includes('/reviews')) {
    return [];
  }
  return null;
}

// Helper to extract payload from API response
export function extractPayload<T>(payload: ApiResponse<T> | T): T | null {
  if (payload && typeof payload === 'object' && 'success' in (payload as Record<string, unknown>)) {
    return ((payload as ApiResponse<T>).data ?? null) as T;
  }
  return payload as T;
}

// Export the axios instance for use in services
export { axiosInstance };
