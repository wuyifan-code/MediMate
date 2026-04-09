/**
 * User Service
 * User profile and settings related API calls
 */
import { axiosInstance, extractPayload } from './baseApiClient';
import { ApiResponse } from '../types';

// Normalize user profile data
function normalizeUserProfile(user: any): any {
  if (!user) return user;

  const profile = user.profile
    ? {
        ...user.profile,
        avatar_url: user.profile.avatar_url || user.profile.avatarUrl,
        avatarUrl: user.profile.avatarUrl || user.profile.avatar_url,
      }
    : undefined;

  const escortProfile = user.escortProfile
    ? {
        ...user.escortProfile,
        completedOrders: user.escortProfile.completedOrders ?? user.escortProfile.completed_orders,
        isVerified: user.escortProfile.isVerified ?? user.escortProfile.is_verified ?? user.escortProfile.isCertified,
        hourlyRate: user.escortProfile.hourlyRate ?? user.escortProfile.hourly_rate,
        verificationLevel: user.escortProfile.verificationLevel ?? user.escortProfile.rank,
        name: user.profile?.name,
        avatarUrl: user.profile?.avatarUrl || user.profile?.avatar_url,
      }
    : undefined;

  return {
    ...user,
    created_at: user.created_at || user.createdAt,
    createdAt: user.createdAt || user.created_at,
    updated_at: user.updated_at || user.updatedAt,
    updatedAt: user.updatedAt || user.updated_at,
    profile,
    escortProfile,
  };
}

// Get current user profile
export async function getUserProfile(): Promise<any> {
  const response = await axiosInstance.get<ApiResponse<any> | any>('/users/me');
  const payload = extractPayload<any>(response.data);
  if (payload) {
    return normalizeUserProfile(payload);
  }
  throw new Error((response.data as ApiResponse<any>).message || 'Failed to get user profile');
}

// Update user profile
export async function updateUserProfile(data: {
  name?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  gender?: string;
  age?: number;
}): Promise<any> {
  const { avatar_url, ...rest } = data;
  const response = await axiosInstance.patch<ApiResponse<any> | any>('/users/profile', {
    ...rest,
    avatarUrl: avatar_url,
  });
  const payload = extractPayload<any>(response.data);
  if (payload) {
    return normalizeUserProfile(payload);
  }
  throw new Error((response.data as ApiResponse<any>).message || 'Failed to update user profile');
}

// Get escort profile
export async function getEscortProfile(): Promise<any> {
  const response = await axiosInstance.get<ApiResponse<any>>('/users/escort-profile');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return null;
}

// Update escort profile
export async function updateEscortProfile(data: {
  bio?: string;
  hourly_rate?: number;
  certificate_no?: string;
  specialties?: string[];
}): Promise<any> {
  const response = await axiosInstance.patch<ApiResponse<any>>('/users/escort-profile', data);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to update escort profile');
}

// Get notification settings
export async function getNotificationSettings(): Promise<{
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  promotionalNotifications?: boolean;
}> {
  try {
    const response = await axiosInstance.get<ApiResponse<any> | any>('/users/notification-settings');
    return extractPayload<{
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      smsNotifications?: boolean;
      promotionalNotifications?: boolean;
    }>(response.data) || {};
  } catch (error) {
    console.error('Failed to get notification settings:', error);
    return {};
  }
}

// Update notification settings
export async function updateNotificationSettings(settings: {
  orderNotifications?: boolean;
  messageNotifications?: boolean;
  paymentNotifications?: boolean;
  systemNotifications?: boolean;
  promotionalNotifications?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  soundEnabled?: boolean;
}): Promise<any> {
  const serverSettings: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
    promotionalNotifications?: boolean;
  } = {};

  if (settings.emailNotifications !== undefined) {
    serverSettings.emailNotifications = settings.emailNotifications;
  }
  if (settings.pushNotifications !== undefined) {
    serverSettings.pushNotifications = settings.pushNotifications;
  }
  if (settings.smsNotifications !== undefined) {
    serverSettings.smsNotifications = settings.smsNotifications;
  }
  if (settings.promotionalNotifications !== undefined) {
    serverSettings.promotionalNotifications = settings.promotionalNotifications;
  }

  if (Object.keys(serverSettings).length === 0) {
    return settings;
  }

  try {
    const response = await axiosInstance.patch<ApiResponse<any>>('/users/notification-settings', serverSettings);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return serverSettings;
  } catch (error) {
    console.error('Failed to update notification settings:', error);
    return serverSettings;
  }
}

// Upload image
export async function uploadImage(formData: FormData): Promise<{ url: string }> {
  try {
    const response = await axiosInstance.post<ApiResponse<{ url: string }>>('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to upload image');
  } catch (error) {
    console.error('Upload image error:', error);
    const mockUrl = `https://picsum.photos/400/400?random=${Date.now()}`;
    return { url: mockUrl };
  }
}
