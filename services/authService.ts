/**
 * Auth Service
 * Authentication related API calls
 */
import { axiosInstance, setToken, setRefreshToken, setUser, clearAuth, getStoredUser } from './baseApiClient';
import { ApiResponse, LoginCredentials, RegisterData, AuthResponse, UserInfo } from '../types';

// Check if user is logged in
export const isLoggedIn = (): boolean => {
  return !!localStorage.getItem('medimate_access_token');
};

// Login
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const { email, password } = credentials;
  const response = await axiosInstance.post<any>('/auth/login', { email, password });

  // Handle direct AuthResponse return
  if (response.data.accessToken && response.data.refreshToken && response.data.user) {
    setToken(response.data.accessToken);
    setRefreshToken(response.data.refreshToken);
    setUser(response.data.user);
    return response.data;
  }
  // Handle wrapped response format
  if (response.data.success && response.data.data) {
    setToken(response.data.data.accessToken);
    setRefreshToken(response.data.data.refreshToken);
    setUser(response.data.data.user);
    return response.data.data;
  }
  throw new Error(response.data.message || 'Login failed');
}

// Register
export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await axiosInstance.post<any>('/auth/register', data);

  // Handle direct AuthResponse return
  if (response.data.accessToken && response.data.refreshToken && response.data.user) {
    setToken(response.data.accessToken);
    setRefreshToken(response.data.refreshToken);
    setUser(response.data.user);
    return response.data;
  }
  // Handle wrapped response format
  if (response.data.success && response.data.data) {
    setToken(response.data.data.accessToken);
    setRefreshToken(response.data.data.refreshToken);
    setUser(response.data.data.user);
    return response.data.data;
  }
  throw new Error(response.data.message || 'Registration failed');
}

// Logout
export async function logout(): Promise<void> {
  try {
    await axiosInstance.post('/auth/logout');
  } catch (error) {
    console.warn('Logout API call failed, cleaning up locally:', error);
  } finally {
    clearAuth();
  }
}

// Get current user from local storage
export function getCurrentUser(): UserInfo | null {
  return getStoredUser();
}
